/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Preload: enables V8 heap allocation tracking so a later snapshot carries
// per-node allocation call stacks (trace_function_infos + trace_tree).
// Resolve the absolute path via `getHeapTrackPreloadPath()` from
// `@kbn/heap-snapshot-analyzer-cli`, pass it to Node via
// `NODE_OPTIONS="--require=<path>"`, and trigger a snapshot with
// `kill -SIGUSR2 <pid>`.

// Only enable inside the actual Kibana server child (forked by the dev CLI with
// isDevCliChild=true). Skip the dev CLI launcher and @kbn/optimizer workers,
// which inherit NODE_OPTIONS but should not be slowed down by allocation
// tracking. Override by setting HEAP_TRACK_FORCE=1.
if (process.env.HEAP_TRACK_FORCE === '1' || process.env.isDevCliChild === 'true') {
  const inspector = require('inspector');
  const fs = require('fs');
  const path = require('path');

  const session = new inspector.Session();
  session.connect();

  let tracking = false;

  session.post('HeapProfiler.enable', (enableErr) => {
    if (enableErr) {
      console.error('[heap-track] HeapProfiler.enable failed:', enableErr);
      return;
    }
    session.post(
      'HeapProfiler.startTrackingHeapObjects',
      { trackAllocations: true },
      (trackErr) => {
        if (trackErr) {
          console.error('[heap-track] startTrackingHeapObjects failed:', trackErr);
          return;
        }
        tracking = true;
        console.error(`[heap-track] allocation tracking started (PID ${process.pid})`);
      }
    );
  });

  let snapshotInFlight = false;

  const takeSnapshot = () => {
    if (!tracking) {
      console.error('[heap-track] tracking not yet enabled, ignoring SIGUSR2');
      return;
    }
    if (snapshotInFlight) {
      console.error('[heap-track] snapshot already in progress, ignoring SIGUSR2');
      return;
    }
    snapshotInFlight = true;

    const outDir = process.env.HEAP_TRACK_DIR || process.cwd();
    const outPath =
      process.env.HEAP_TRACK_OUTPUT ||
      path.join(
        outDir,
        `heap-tracked-${new Date().toISOString().replace(/[:.]/g, '-')}.heapsnapshot`
      );

    const stream = fs.createWriteStream(outPath);
    const chunkListener = (m) => stream.write(m.params.chunk);
    session.on('HeapProfiler.addHeapSnapshotChunk', chunkListener);

    console.error(`[heap-track] taking snapshot -> ${outPath}`);
    const start = Date.now();
    session.post(
      'HeapProfiler.takeHeapSnapshot',
      { reportProgress: false, treatGlobalObjectsAsRoots: true, captureNumericValue: false },
      (err) => {
        session.removeListener('HeapProfiler.addHeapSnapshotChunk', chunkListener);
        stream.end(() => {
          if (err) {
            console.error('[heap-track] takeHeapSnapshot failed:', err);
          } else {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
            console.error(`[heap-track] snapshot written in ${elapsed}s (${sizeMb} MB)`);
          }
          snapshotInFlight = false;
        });
      }
    );
  };

  process.on('SIGUSR2', takeSnapshot);

  console.error(
    `[heap-track] preload installed (PID ${process.pid}) — kill -SIGUSR2 ${process.pid} to capture`
  );
}
