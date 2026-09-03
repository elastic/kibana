/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone Task Manager loop simulation — does not boot Kibana.
 *
 * Custom Node (labels API):
 *   KBN_HEAP_PROFILE_LABELS=1 KBN_HEAP_PROFILE_LABELS_DEBUG=1 \
 *     /Users/rudolf/dev/node/out/Release/node experiments/heap_profile_label_otel/harness.js
 *
 * Stock Node (must no-op):
 *   KBN_HEAP_PROFILE_LABELS=1 node experiments/heap_profile_label_otel/harness.js
 */

const {
  HEAP_PROFILE_LABELS_ENV,
  hasHeapProfileLabelsApi,
  isHeapProfileLabelsEnabled,
  withTaskTypeHeapProfileLabels,
} = require('./heap_profile_labels');
const { startHeapProfileLabelExport } = require('./scrape_export');

const FAKE_TASK_TYPES = ['alerting:monitoring', 'reports:execute', 'saved_objects:snapshot'];
const EXTERNAL_BYTES_BY_TYPE = {
  'alerting:monitoring': 2 * 1024 * 1024,
  'reports:execute': 4 * 1024 * 1024,
  'saved_objects:snapshot': 1 * 1024 * 1024,
};

function log(event, extra) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ...extra }));
}

async function runFakeTask(taskType) {
  return withTaskTypeHeapProfileLabels(taskType, async () => {
    const retained = [];
    retained.push(Buffer.alloc(EXTERNAL_BYTES_BY_TYPE[taskType], 7));
    // Heap churn large enough for a 64KiB sampling interval to see some samples.
    const heap = [];
    for (let i = 0; i < 4000; i++) {
      heap.push({ i, pad: 'x'.repeat(512), taskType });
    }
    retained.push(heap);
    await new Promise((resolve) => setTimeout(resolve, 25));
    return retained;
  });
}

async function main() {
  const apiPresent = hasHeapProfileLabelsApi();
  log('harness_start', {
    node: process.execPath,
    envFlag: isHeapProfileLabelsEnabled(),
    apiPresent,
    taskTypes: FAKE_TASK_TYPES,
  });

  if (!isHeapProfileLabelsEnabled()) {
    log('noop', { reason: `set ${HEAP_PROFILE_LABELS_ENV}=1` });
    process.exitCode = 0;
    return;
  }

  if (!apiPresent) {
    log('noop', { reason: 'heap profile labels API not available (stock Node)' });
    process.exitCode = 0;
    return;
  }

  let exportFired = false;
  const session = startHeapProfileLabelExport({
    debugLog: true,
    scrapeIntervalMs: 2000,
    onExport: () => {
      exportFired = true;
    },
  });

  if (!session.started) {
    log('noop', { reason: session.reason });
    process.exitCode = 0;
    return;
  }

  const retainedByType = {};
  for (const taskType of FAKE_TASK_TYPES) {
    retainedByType[taskType] = await runFakeTask(taskType);
    log('task_ran', { taskType, retainedExternal: EXTERNAL_BYTES_BY_TYPE[taskType] });
  }

  const snapshot = session.scrape();
  const externalByType = {};
  for (const row of snapshot.live) {
    if (row.source === 'exact') {
      externalByType[row.taskType] = row.bytes;
    }
  }

  const missing = FAKE_TASK_TYPES.filter((taskType) => !externalByType[taskType]);
  log('scrape', {
    scrapeDurationMs: snapshot.scrapeDurationMs,
    skipped: snapshot.skipped,
    live: snapshot.live,
    sampleCount: snapshot.sampleCount,
    externalByType,
    missingExternalTypes: missing,
  });

  await session.meterProvider.forceFlush();
  log('export', { exportFired, rows: session.getLastExportRows().length });

  await session.stop();
  // Keep a reference so V8 cannot collect the buffers before scrape/export.
  void retainedByType;

  const ok = missing.length === 0 && snapshot.skipped === false;
  log('harness_done', { ok, exportFired });
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
