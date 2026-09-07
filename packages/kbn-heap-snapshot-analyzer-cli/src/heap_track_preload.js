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
  const Module = require('module');

  // Multi-parent require edge graph. Node's require.cache only keeps the
  // first parent that loaded a given module — every later requirer is
  // invisible. To answer "who actually pulls X server-side?" we patch
  // Module.prototype.require here in the preload (which runs before any
  // user code) and record every (parent, child) edge as it happens. This
  // is the same hook point as `require-in-the-middle`, just observe-only.
  const requireEdges = new Map(); // child filename -> Set<parent filename | '<entry>'>
  const origRequire = Module.prototype.require;
  Module.prototype.require = function patchedRequire(request) {
    const exported = origRequire.apply(this, arguments);
    try {
      const child = Module._resolveFilename(request, this);
      const parent = (this && this.filename) || '<entry>';
      let parents = requireEdges.get(child);
      if (!parents) {
        parents = new Set();
        requireEdges.set(child, parents);
      }
      parents.add(parent);
    } catch (_) {
      // Ignore unresolvable requests (conditional requires, etc.).
    }
    return exported;
  };

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

  // SIGUSR1: dump the multi-parent require edge graph collected by the
  // patched Module.prototype.require above. Output is JSONL, one line per
  // module: {"id": "<absolute path>", "parents": ["<absolute path>", ...]}.
  // Modules requested by the entry script appear with parent "<entry>".
  // Unlike Node's require.cache (which only keeps the FIRST requirer), this
  // captures every distinct caller of every module.
  const dumpRequireCache = () => {
    const outDir = process.env.HEAP_TRACK_DIR || process.cwd();
    const outPath =
      process.env.REQUIRE_CACHE_OUTPUT ||
      path.join(outDir, `require-cache-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

    const start = Date.now();
    const stream = fs.createWriteStream(outPath);
    let count = 0;
    let edgeCount = 0;
    for (const [id, parents] of requireEdges) {
      const arr = Array.from(parents);
      edgeCount += arr.length;
      stream.write(JSON.stringify({ id, parents: arr }) + '\n');
      count++;
    }
    stream.end(() => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.error(
        `[heap-track] require graph dumped (${count} modules, ${edgeCount} edges, ${sizeKb} KB) in ${elapsed}s -> ${outPath}`
      );
    });
  };

  process.on('SIGUSR1', dumpRequireCache);

  console.error(
    `[heap-track] preload installed (PID ${process.pid}) — ` +
      `SIGUSR2 = heap snapshot, SIGUSR1 = require.cache dump`
  );
}
