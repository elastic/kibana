/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const v8 = require('v8');
const fs = require('fs');

// A profile pins the bench to the one bundle its file path was given for; forcing one run keeps it
// unambiguous which run's cost the file holds. CPU: from fork to idle. Heap: a full snapshot at idle.
const cpuProfileFile = process.env.TASK_BUNDLE_CPU_PROFILE_FILE;
const heapProfileFile = process.env.TASK_BUNDLE_HEAP_PROFILE_FILE;
let session;
// `Profiler.start` is a protocol round trip; its own callback may still be pending when `idle`
// is reached. `cpuProfileReady` resolves once `Profiler.start` has actually taken effect, so the
// `idle` handler waits for it instead of racing it (which previously skipped `Profiler.stop`
// entirely and sent an empty profile).
let cpuProfileReady = Promise.resolve();
if (cpuProfileFile || heapProfileFile) {
  const inspector = require('node:inspector');
  session = new inspector.Session();
  session.connect();
  if (cpuProfileFile) {
    session.post('Profiler.enable');
    cpuProfileReady = new Promise((resolve, reject) => {
      session.post('Profiler.start', (error) => (error ? reject(error) : resolve()));
    });
  }
}

// Loaded only by the development benchmark, never by the supervisor or a distributable entry.
if (process.send) {
  const send = process.send.bind(process);
  const snapshot = (phase) =>
    send({
      kind: 'task-bundle-memory',
      phase,
      usage: process.memoryUsage(),
      peakRss: process.resourceUsage().maxRSS * 1024,
      spaces: v8.getHeapSpaceStatistics(),
    });
  process.send = (message, ...args) => {
    if (message?.kind === 'ready') snapshot('ready');
    return send(message, ...args);
  };
  process.on('message', async (message) => {
    if (message?.kind !== 'task-bundle-memory') return;
    // The idle snapshot always goes out before the profile, which can take a moment to collect.
    snapshot(message.phase);
    if (message.phase !== 'idle' || !session) return;
    if (cpuProfileFile) {
      await cpuProfileReady.catch(() => undefined);
      await new Promise((resolve) => {
        session.post('Profiler.stop', (error, result) => {
          if (!error) fs.writeFileSync(cpuProfileFile, JSON.stringify(result.profile));
          resolve();
        });
      });
    }
    if (heapProfileFile) {
      const stream = fs.createWriteStream(heapProfileFile);
      session.on('HeapProfiler.addHeapSnapshotChunk', ({ params }) => stream.write(params.chunk));
      await new Promise((resolve) => {
        session.post('HeapProfiler.takeHeapSnapshot', () => {
          stream.end(resolve);
        });
      });
    }
    send({ kind: 'task-bundle-profile', cpuProfileFile, heapProfileFile });
  });
  setInterval(() => send({ kind: 'task-bundle-rss', rss: process.memoryUsage.rss() }), 50).unref();
}
