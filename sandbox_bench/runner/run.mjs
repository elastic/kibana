#!/usr/bin/env node
/**
 * Sandbox provider benchmark orchestrator.
 *
 *   node sandbox_bench/runner/run.mjs --provider docker --level l5 --iterations 3
 *   node sandbox_bench/runner/run.mjs --provider docker --level l5 --mode warm
 *   node sandbox_bench/runner/run.mjs --provider docker --level l1 --mode burst --concurrency 5
 *
 * Zero dependencies; requires Node >= 20.
 */

import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEVELS, SPEC_TIERS } from './levels.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TASKS_DIR = join(HERE, '..', 'tasks');
const RESULTS_DIR = join(HERE, '..', 'results');

const parseArgs = (argv) => {
  const args = { mode: 'cold', concurrency: 5 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return args;
};

const buildPayload = (taskFile, env) => {
  const lib = readFileSync(join(TASKS_DIR, 'lib.sh'), 'utf8');
  const task = readFileSync(join(TASKS_DIR, taskFile), 'utf8');
  const preamble = Object.entries(env)
    .map(([k, v]) => `export ${k}=${JSON.stringify(String(v))}`)
    .join('\n');
  return `${preamble}\n${lib}\n${task}`;
};

const parseMarkers = (stdout) => {
  const phases = [];
  const kv = {};
  let failReason;
  for (const line of stdout.split('\n')) {
    const phaseMatch = line.match(/^##BENCH## phase=(\S+) t=(\d+)$/);
    if (phaseMatch) {
      phases.push({ name: phaseMatch[1], t: Number(phaseMatch[2]) });
      continue;
    }
    const kvMatch = line.match(/^##BENCH## kv (\S+?)=(.*)$/);
    if (kvMatch) {
      kv[kvMatch[1]] = kvMatch[2];
      continue;
    }
    const failMatch = line.match(/^##BENCH## fail reason=(.+)$/);
    if (failMatch) failReason = failMatch[1];
  }
  // Durations between consecutive markers, keyed by the marker that closes the segment.
  const phaseMs = {};
  for (let i = 1; i < phases.length; i++) {
    phaseMs[phases[i].name] = phases[i].t - phases[i - 1].t;
  }
  return { phaseMs, kv, failReason };
};

const runIteration = async ({ provider, level, levelMeta, spec, env, iter, mode }) => {
  const record = { provider: provider.name, level, mode, iter, startedAt: new Date().toISOString(), spec };
  const t0 = Date.now();
  let handle;
  try {
    handle = await provider.create(spec);
    record.provisionMs = Date.now() - t0;
    const payload = buildPayload(levelMeta.task, env);
    const tExec = Date.now();
    const res = await provider.exec(handle, payload, { timeoutMs: levelMeta.ceilingMs });
    record.execMs = Date.now() - tExec;
    record.totalMs = Date.now() - t0;
    const { phaseMs, kv, failReason } = parseMarkers(res.stdout);
    Object.assign(record, { phaseMs, kv, exitCode: res.exitCode });
    record.success = res.exitCode === 0 && !failReason && record.execMs <= levelMeta.ceilingMs;
    if (!record.success) {
      record.failReason = failReason ?? (record.execMs > levelMeta.ceilingMs ? 'ceiling_exceeded' : `exit_${res.exitCode}`);
      record.stderrTail = res.stderr.slice(-2000);
    }
  } catch (err) {
    record.success = false;
    record.failReason = `harness_error: ${err.message}`;
  } finally {
    if (handle) await provider.destroy(handle).catch(() => {});
  }
  return record;
};

/** Warm-resume (L6): provision to L5-green once, snapshot, then time N resumes. */
const runWarm = async ({ provider, spec, env, iterations, writeRecord }) => {
  if (!provider.capabilities?.snapshot) {
    writeRecord({ provider: provider.name, level: 'l6', mode: 'warm', success: false, failReason: 'snapshot_unsupported' });
    console.log(`${provider.name} does not support snapshot/resume — recorded as unsupported.`);
    return;
  }
  console.log('Provisioning golden sandbox to L5-green (this is the slow part)…');
  const handle = await provider.create(spec);
  const payload = buildPayload(LEVELS.l5.task, { ...env, BENCH_KEEP_STACK: '1' });
  const res = await provider.exec(handle, payload, { timeoutMs: LEVELS.l5.ceilingMs });
  if (res.exitCode !== 0) {
    await provider.destroy(handle).catch(() => {});
    throw new Error(`L5 provisioning for warm mode failed (exit ${res.exitCode}):\n${res.stderr.slice(-2000)}`);
  }
  const snapId = await provider.snapshot(handle);
  await provider.destroy(handle).catch(() => {});

  const probe = [
    'set -euo pipefail',
    `${readFileSync(join(TASKS_DIR, 'lib.sh'), 'utf8')}`,
    'bench_phase resume_probe_start',
    'wait_for_http "http://elastic:changeme@localhost:5601/api/status" 240 "^200$" || bench_fail stack_not_responsive',
    'bench_phase stack_responsive',
  ].join('\n');

  for (let iter = 0; iter < iterations; iter++) {
    const record = { provider: provider.name, level: 'l6', mode: 'warm', iter, startedAt: new Date().toISOString(), spec };
    const t0 = Date.now();
    let resumed;
    try {
      resumed = await provider.resume(snapId);
      record.provisionMs = Date.now() - t0;
      const pres = await provider.exec(resumed, probe, { timeoutMs: LEVELS.l6.ceilingMs });
      record.totalMs = Date.now() - t0;
      const { phaseMs, failReason } = parseMarkers(pres.stdout);
      record.phaseMs = phaseMs;
      record.success = pres.exitCode === 0 && !failReason;
      if (!record.success) record.failReason = failReason ?? `exit_${pres.exitCode}`;
    } catch (err) {
      record.success = false;
      record.failReason = `harness_error: ${err.message}`;
    } finally {
      if (resumed) await provider.destroy(resumed).catch(() => {});
    }
    writeRecord(record);
    console.log(`warm iter ${iter}: ${record.success ? `${record.totalMs} ms` : `FAIL (${record.failReason})`}`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const level = args.level ?? 'l0';
  const levelMeta = LEVELS[level];
  if (!levelMeta) throw new Error(`unknown level "${level}" (${Object.keys(LEVELS).join(', ')})`);

  const config = args.config ? JSON.parse(readFileSync(args.config, 'utf8')) : {};
  const providerName = args.provider ?? 'local';
  const providerModule = await import(pathToFileURL(join(HERE, 'providers', `${providerName}.mjs`)));
  const provider = { name: providerName, ...providerModule };
  if (provider.init) await provider.init(config.providers?.[providerName] ?? {});

  const spec = { ...SPEC_TIERS[levelMeta.spec], ...config.specs?.[level] };
  const env = { ...config.env, ...(args.cloneMode ? { CLONE_MODE: args.cloneMode } : {}) };
  const iterations = Number(args.iterations ?? levelMeta.defaultIterations);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const outFile = join(RESULTS_DIR, `${providerName}-${level}-${args.mode}-${Date.now()}.jsonl`);
  const writeRecord = (record) => appendFileSync(outFile, `${JSON.stringify(record)}\n`);

  console.log(`provider=${providerName} level=${level} mode=${args.mode} spec=${JSON.stringify(spec)} → ${outFile}`);

  if (args.mode === 'warm') {
    await runWarm({ provider, spec, env, iterations, writeRecord });
  } else if (args.mode === 'burst') {
    const concurrency = Number(args.concurrency);
    const records = await Promise.all(
      Array.from({ length: concurrency }, (_, iter) =>
        runIteration({ provider, level, levelMeta, spec, env, iter, mode: 'burst' })
      )
    );
    records.forEach(writeRecord);
    records.forEach((r) => console.log(`burst iter ${r.iter}: ${r.success ? `${r.totalMs} ms` : `FAIL (${r.failReason})`}`));
  } else {
    for (let iter = 0; iter < iterations; iter++) {
      const record = await runIteration({ provider, level, levelMeta, spec, env, iter, mode: 'cold' });
      writeRecord(record);
      console.log(`cold iter ${iter}: ${record.success ? `${record.totalMs} ms` : `FAIL (${record.failReason})`}`);
    }
  }

  console.log(`done → ${outFile}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
