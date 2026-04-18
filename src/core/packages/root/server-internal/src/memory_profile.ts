/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFile, writeFile } from 'fs/promises';
import Path from 'path';
import { PerformanceObserver, constants as perfConstants } from 'node:perf_hooks';
import v8 from 'v8';
import type { Logger } from '@kbn/logging';

/**
 * Memory profiling.
 *
 * When `KBN_MEM_PROFILE=1` (or `true`), or CLI `--mem-profile`, samples memory for 5 minutes,
 * logs each sample at debug on the `memory-profile` logger,
 * and appends each row to `kibana-memory-profile-<timestamp>.csv` in cwd.
 *
 * The CSV file can be used for charting memory usage over time.
 * Also adds additional output to the console including Garbage collection.
 * Terminates kibana process automatically after 5 minuters of profiling.
 *
 * @example
 * ```
 * $ KBN_MEM_PROFILE=1 node scripts/kibana --dev --server.basePath="/kbn" > "kibana.output.$(date -u +%Y%m%dT%H%M).txt" 2>&1
 * ```
 */

const INTERVAL_MS = 500;
const DURATION_MS = 5 * 60 * 1000;
const SAMPLES = DURATION_MS / INTERVAL_MS;

const CSV_HEADER = [
  'sequence',
  'timestamp_ms',
  'rss',
  'heap_total',
  'heap_used',
  'external',
  'array_buffers',
  'v8_used_heap_size',
  'v8_total_heap_size',
  'v8_external_memory',
  'v8_malloced_memory',
  'v8_peak_malloced_memory',
  'v8_total_physical_size',
].join(',');

function formatGcKind(kind: number): string {
  switch (kind) {
    case perfConstants.NODE_PERFORMANCE_GC_INCREMENTAL:
      return 'incremental';
    case perfConstants.NODE_PERFORMANCE_GC_MINOR:
      return 'minor';
    case perfConstants.NODE_PERFORMANCE_GC_MAJOR:
      return 'major';
    case perfConstants.NODE_PERFORMANCE_GC_WEAKCB:
      return 'weakcb';
    default:
      return `kind_${kind}`;
  }
}

function isMemoryProfilingEnabled(): boolean {
  const raw = process.env.KBN_MEM_PROFILE?.trim();
  if (raw === '1' || raw?.toLowerCase() === 'true') {
    return true;
  }
  return process.argv.some((arg) => arg === '--mem-profile' || arg.startsWith('--mem-profile='));
}

function resolveOutputFilePathWhenEnabled(): string | undefined {
  if (!isMemoryProfilingEnabled()) {
    return undefined;
  }
  return Path.join(
    process.cwd(),
    `kibana-memory-profile-${new Date().toISOString().slice(0, 16).replace(':', '.')}.csv`
  );
}

export function maybeStartMemoryProfileCsv(log: Logger): void {
  const outputPath = resolveOutputFilePathWhenEnabled();
  if (!outputPath) {
    return;
  }
  log.warn('KBN_MEM_PROFILE=1 detected. Memory profiling enabled..');
  log.warn(`Memory profiling output: ${outputPath}`);

  const startedAt = Date.now();
  let tick = 0;

  // Visible without logging config (dev child stdout is easy to miss for custom loggers).
  process.stderr.write(
    `[KBN_MEM_PROFILE] enabled: ${SAMPLES} samples / ${INTERVAL_MS}ms, appending to ${outputPath}\n`
  );

  log.info(
    `Memory profile enabled: ${SAMPLES} samples every ${INTERVAL_MS}ms, appending to ${outputPath}`
  );

  const gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType !== 'gc') {
        continue;
      }
      const detail = (entry as PerformanceEntry & { detail?: { kind: number; flags: number } })
        .detail;
      const kindLabel = detail ? formatGcKind(detail.kind) : 'unknown';
      if (kindLabel !== 'minor') {
        log.warn(
          `Garbage collection: kind=${kindLabel} durationMs=${entry.duration.toFixed(3)} flags=${
            detail?.flags ?? 'n/a'
          }`
        );
      }
    }
  });
  gcObserver.observe({ entryTypes: ['gc'] });

  void (async () => {
    try {
      await writeFile(outputPath, `${CSV_HEADER}\n`, 'utf8');
    } catch (err) {
      gcObserver.disconnect();
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[KBN_MEM_PROFILE] failed to create CSV: ${message}\n`);
      log.error(`Failed to create memory profile CSV: ${message}`);
      return;
    }

    const id = setInterval(() => {
      tick += 1;
      const timestampMs = Date.now();
      const mu = process.memoryUsage();
      const hs = v8.getHeapStatistics();

      const line = [
        tick,
        timestampMs,
        mu.rss,
        mu.heapTotal,
        mu.heapUsed,
        mu.external,
        mu.arrayBuffers,
        hs.used_heap_size,
        hs.total_heap_size,
        hs.external_memory,
        hs.malloced_memory,
        hs.peak_malloced_memory,
        hs.total_physical_size,
      ].join(',');

      log.warn(
        `memory sample ${tick}/${SAMPLES}: rss=${mu.rss} heapUsed=${mu.heapUsed} v8_total_heap_size=${hs.total_heap_size}`
      );

      void appendFile(outputPath, `${line}\n`, 'utf8').catch((appendErr: Error) => {
        process.stderr.write(`[KBN_MEM_PROFILE] append failed: ${appendErr.message}\n`);
        log.error(`Memory profile append failed: ${appendErr.message}`);
      });

      if (tick >= SAMPLES) {
        clearInterval(id);
        gcObserver.disconnect();
        const msg = `Memory profile complete after ${
          Date.now() - startedAt
        }ms (${tick} rows) -> ${outputPath}`;
        process.stderr.write(`[KBN_MEM_PROFILE] ${msg}\n`);
        log.info(msg);
        // Finished profiling.
        // Terminate current process
        process.kill(process.pid, 'SIGTERM');
      }
    }, INTERVAL_MS);
  })();
}
