/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Experimental scrape + OTel export of heap-profile labels by `task.type`.
 *
 * Reuses Kibana-hoisted packages (do not add these to root package.json):
 *   @opentelemetry/api
 *   @opentelemetry/sdk-metrics  (transitive; present in node_modules)
 *   @opentelemetry/exporter-metrics-otlp-http
 */

const v8 = require('v8');
const { ValueType } = require('@opentelemetry/api');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

const {
  HEAP_PROFILE_LABELS_ENV,
  TASK_TYPE_LABEL_KEY,
  isHeapProfileLabelsEnabled,
  hasHeapProfileLabelsApi,
} = require('./heap_profile_labels');

const UNLABELED = '_unlabeled';
const OTHER = '_other';
const TOP_N = 256;
const SAMPLE_INTERVAL_BYTES = 64 * 1024;
const DEFAULT_SCRAPE_MS = 15_000;

/** @type {{ live: Array<{taskType: string, source: string, confidence: string, bytes: number}>, sampleCount: Array<{taskType: string, count: number}>, scrapeDurationMs: number, skipped: boolean }} */
let lastSnapshot = {
  live: [],
  sampleCount: [],
  scrapeDurationMs: 0,
  skipped: false,
};

let lastDebugCallback = null;

function taskTypeFromLabels(labels) {
  if (!labels || typeof labels !== 'object') {
    return UNLABELED;
  }
  const value = labels[TASK_TYPE_LABEL_KEY];
  if (typeof value !== 'string' || value.length === 0) {
    return UNLABELED;
  }
  return value;
}

function addToMap(map, key, n) {
  map.set(key, (map.get(key) || 0) + n);
}

/**
 * Split exact external bytes from sampled heap (size*count, no Poisson scale).
 * @param {{ samples?: Array<{ size: number, count: number, labels?: object }>, externalBytes?: Array<{ labels?: object, bytes: number }> }} profile
 */
function aggregateProfile(profile) {
  const external = new Map();
  const sampled = new Map();
  const sampleCounts = new Map();

  for (const row of profile.externalBytes || []) {
    addToMap(external, taskTypeFromLabels(row.labels), Number(row.bytes) || 0);
  }
  for (const sample of profile.samples || []) {
    const key = taskTypeFromLabels(sample.labels);
    // Statistical estimate only — do not Poisson-scale.
    addToMap(sampled, key, (Number(sample.size) || 0) * (Number(sample.count) || 0));
    addToMap(sampleCounts, key, Number(sample.count) || 0);
  }

  return { external, sampled, sampleCounts };
}

function collapseTopN(map, n = TOP_N) {
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length <= n) {
    return new Map(entries);
  }
  const kept = new Map(entries.slice(0, n));
  let other = 0;
  for (const [, value] of entries.slice(n)) {
    other += value;
  }
  if (other > 0) {
    kept.set(OTHER, (kept.get(OTHER) || 0) + other);
  }
  return kept;
}

function snapshotFromProfile(profile, durationMs) {
  const { external, sampled, sampleCounts } = aggregateProfile(profile);
  const live = [];
  for (const [taskType, bytes] of collapseTopN(external)) {
    live.push({ taskType, source: 'exact', confidence: 'exact', bytes });
  }
  for (const [taskType, bytes] of collapseTopN(sampled)) {
    live.push({ taskType, source: 'sampled_heap', confidence: 'sampled', bytes });
  }
  const sampleCount = [...collapseTopN(sampleCounts)].map(([taskType, count]) => ({
    taskType,
    count,
  }));
  return { live, sampleCount, scrapeDurationMs: durationMs, skipped: false };
}

function scrape(handle) {
  const start = process.hrtime.bigint();
  const profile = handle.getAllocationProfile();
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
  if (profile === undefined) {
    lastSnapshot = { live: [], sampleCount: [], scrapeDurationMs: durationMs, skipped: true };
    return lastSnapshot;
  }
  lastSnapshot = snapshotFromProfile(profile, durationMs);
  if (typeof lastDebugCallback === 'function') {
    lastDebugCallback(lastSnapshot, profile);
  }
  return lastSnapshot;
}

function createConsoleMetricExporter(onExport) {
  return {
    export(resourceMetrics, resultCallback) {
      if (typeof onExport === 'function') {
        onExport(resourceMetrics);
      }
      resultCallback({ code: 0 });
    },
    async shutdown() {},
    async forceFlush() {},
  };
}

function collectObservableRows(resourceMetrics) {
  const rows = [];
  for (const scopeMetrics of resourceMetrics.scopeMetrics || []) {
    for (const metric of scopeMetrics.metrics || []) {
      for (const point of metric.dataPoints || []) {
        rows.push({
          name: metric.descriptor?.name,
          value: point.value,
          attributes: point.attributes,
        });
      }
    }
  }
  return rows;
}

/**
 * Start a labels heap-profile session and emit OTel gauges on a 15s timer.
 * @param {{ debugLog?: boolean, scrapeIntervalMs?: number, onExport?: Function, onScrape?: Function }} [options]
 */
function startHeapProfileLabelExport(options = {}) {
  const debugLog = options.debugLog === true || process.env.KBN_HEAP_PROFILE_LABELS_DEBUG === '1';
  const scrapeIntervalMs = options.scrapeIntervalMs || DEFAULT_SCRAPE_MS;

  if (!isHeapProfileLabelsEnabled()) {
    return { started: false, reason: `set ${HEAP_PROFILE_LABELS_ENV}=1` };
  }
  if (!hasHeapProfileLabelsApi() || typeof v8.startHeapProfile !== 'function') {
    return { started: false, reason: 'heap profile labels API not available (stock Node)' };
  }

  const handle = v8.startHeapProfile({ labels: true, sampleInterval: SAMPLE_INTERVAL_BYTES });
  lastDebugCallback = options.onScrape || null;

  const otlpUrl =
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const useConsole = debugLog || !otlpUrl;

  let lastExportRows = [];
  const exporter = useConsole
    ? createConsoleMetricExporter((resourceMetrics) => {
        lastExportRows = collectObservableRows(resourceMetrics);
        if (debugLog) {
          // eslint-disable-next-line no-console
          console.log(JSON.stringify({ event: 'otel_export', rows: lastExportRows }, null, 2));
        }
        if (typeof options.onExport === 'function') {
          options.onExport(lastExportRows);
        }
      })
    : new OTLPMetricExporter({ url: otlpUrl });

  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL) || scrapeIntervalMs,
  });

  const meterProvider = new MeterProvider({ readers: [reader] });
  // Isolated provider — do not clobber Kibana's global meter if this is loaded there.
  const meter = meterProvider.getMeter('nodejs.heap_profile');

  meter
    .createObservableGauge('nodejs.heap_profile.live', {
      description:
        'Live bytes attributed to a Task Manager task type (exact external vs sampled heap).',
      unit: 'By',
      valueType: ValueType.INT,
    })
    .addCallback((result) => {
      for (const row of lastSnapshot.live) {
        result.observe(row.bytes, {
          'task.type': row.taskType,
          'memory.source': row.source,
          confidence: row.confidence,
        });
      }
    });

  meter
    .createObservableGauge('nodejs.heap_profile.sample.count', {
      description: 'Count of live heap-profile samples attributed to a task type.',
      unit: '{sample}',
      valueType: ValueType.INT,
    })
    .addCallback((result) => {
      for (const row of lastSnapshot.sampleCount) {
        result.observe(row.count, { 'task.type': row.taskType });
      }
    });

  meter
    .createObservableGauge('nodejs.heap_profile.scrape.duration', {
      description: 'Wall time of the last getAllocationProfile() scrape.',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    })
    .addCallback((result) => {
      result.observe(lastSnapshot.scrapeDurationMs);
    });

  const timer = setInterval(() => {
    scrape(handle);
  }, scrapeIntervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    started: true,
    handle,
    meterProvider,
    reader,
    scrape: () => scrape(handle),
    getSnapshot: () => lastSnapshot,
    getLastExportRows: () => lastExportRows,
    async stop() {
      clearInterval(timer);
      await meterProvider.shutdown();
      if (typeof handle.stop === 'function') {
        handle.stop();
      }
    },
  };
}

module.exports = {
  UNLABELED,
  OTHER,
  TOP_N,
  SAMPLE_INTERVAL_BYTES,
  taskTypeFromLabels,
  aggregateProfile,
  collapseTopN,
  snapshotFromProfile,
  startHeapProfileLabelExport,
};
