/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { BaseReporter } = require('@jest/reporters');
const { monitorEventLoopDelay } = require('perf_hooks');
const fs = require('fs');
const os = require('os');
const path = require('path');

const NS_PER_MS = 1e6;
const SAMPLE_INTERVAL_MS = 1000;

/**
 * Jest reporter that captures per-config/shard CI-agent resource pressure:
 * event-loop delay percentiles (from `perf_hooks.monitorEventLoopDelay`) plus
 * host load average and free memory. Because Jest runs `--runInBand`, a stalled
 * event loop on a starved agent is the common cause of bare `Exceeded timeout`
 * failures with no assertion error; these metrics let an investigator confirm
 * starvation instead of inferring it.
 *
 * Output is written per config/shard to `target/agent_diagnostics/`, which CI
 * uploads on failing test steps (from the failing attempt itself, so a
 * retry-to-green cannot shadow it).
 *
 * Everything here is best-effort: it only runs on CI and never throws, so it
 * cannot affect Jest's exit code.
 */
class AgentMetricsReporter extends BaseReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig, options);
    this._enabled = !!process.env.CI;
    this._histogram = undefined;
    this._sampler = undefined;
    this._startTime = 0;
    // Running aggregates so memory stays flat even on long integration runs.
    this._maxLoad1m = 0;
    this._minFreeMem = Number.POSITIVE_INFINITY;
    this._sampleCount = 0;
    this._startFreeMem = os.freemem();
    this._startLoad = os.loadavg();
  }

  onRunStart() {
    if (!this._enabled) return;
    try {
      this._startTime = Date.now();
      this._histogram = monitorEventLoopDelay({ resolution: 20 });
      this._histogram.enable();

      this._sampler = setInterval(() => {
        try {
          const load1m = os.loadavg()[0];
          if (load1m > this._maxLoad1m) this._maxLoad1m = load1m;
          const freeMem = os.freemem();
          if (freeMem < this._minFreeMem) this._minFreeMem = freeMem;
          this._sampleCount += 1;
        } catch (e) {
          // ignore sampling errors
        }
      }, SAMPLE_INTERVAL_MS);
      // Don't keep the process alive just for the sampler.
      this._sampler.unref();
    } catch (e) {
      // If perf_hooks isn't available, silently disable — never break the run.
      this._enabled = false;
    }
  }

  onRunComplete(_contexts, results) {
    if (!this._enabled) return;
    try {
      if (this._sampler) clearInterval(this._sampler);
      if (this._histogram) this._histogram.disable();

      const { config, shard } = this._parseTarget();
      const h = this._histogram;
      const toMs = (ns) => (typeof ns === 'number' && isFinite(ns) ? ns / NS_PER_MS : null);

      const metrics = {
        config,
        shard: shard || null,
        testType: process.env.TEST_TYPE || null,
        jestMaxParallel: process.env.JEST_MAX_PARALLEL || null,
        buildkiteJobId: process.env.BUILDKITE_JOB_ID || null,
        buildkiteParallelJob: process.env.BUILDKITE_PARALLEL_JOB || null,
        buildkiteRetryCount: process.env.BUILDKITE_RETRY_COUNT || null,
        pid: process.pid,
        hostname: os.hostname(),
        cpuCount: os.cpus().length,
        totalMemBytes: os.totalmem(),
        startTime: new Date(this._startTime).toISOString(),
        durationMs: Date.now() - this._startTime,
        numTotalTests: results ? results.numTotalTests : undefined,
        numFailedTests: results ? results.numFailedTests : undefined,
        eventLoopDelayMs: h
          ? {
              mean: toMs(h.mean),
              p50: toMs(h.percentile(50)),
              p90: toMs(h.percentile(90)),
              p99: toMs(h.percentile(99)),
              max: toMs(h.max),
              min: toMs(h.min),
              stddev: toMs(h.stddev),
            }
          : null,
        load: {
          start: this._startLoad,
          end: os.loadavg(),
          max1m: this._maxLoad1m,
          samples: this._sampleCount,
        },
        freeMemBytes: {
          start: this._startFreeMem,
          end: os.freemem(),
          min: isFinite(this._minFreeMem) ? this._minFreeMem : null,
        },
      };

      this._write(config, shard, metrics);
    } catch (e) {
      // never break Jest
    }
  }

  /**
   * Recover the `--config` and `--shard` this Jest process was launched with so
   * the metrics file is keyed to the exact failing shard.
   */
  _parseTarget() {
    const argv = process.argv;
    let config = 'unknown';
    let shard;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--config' && argv[i + 1]) config = argv[i + 1];
      else if (argv[i].startsWith('--config=')) config = argv[i].slice('--config='.length);
      else if (argv[i] === '--shard' && argv[i + 1]) shard = argv[i + 1];
      else if (argv[i].startsWith('--shard=')) shard = argv[i].slice('--shard='.length);
    }
    return { config, shard };
  }

  _write(config, shard, metrics) {
    const dir = path.resolve(process.cwd(), 'target', 'agent_diagnostics');
    fs.mkdirSync(dir, { recursive: true });
    const safeConfig = config.replace(/[^a-zA-Z0-9]/g, '_');
    const shardSuffix = shard ? `_shard_${shard.replace('/', '_')}` : '';
    const file = path.join(dir, `jest-metrics-${safeConfig}${shardSuffix}-${process.pid}.json`);
    fs.writeFileSync(file, JSON.stringify(metrics, null, 2));
  }
}

module.exports = AgentMetricsReporter;
