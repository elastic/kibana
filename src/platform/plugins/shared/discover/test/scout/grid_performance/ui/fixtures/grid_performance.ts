/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient, ScoutPage } from '@kbn/scout';

export const GRID_PERF_INDEX = 'grid-perf';
/**
 * Matches the logs data source profile, which switches the grid to a single page. Not `logs-*`,
 * which Elasticsearch reserves for data streams.
 */
export const GRID_PERF_LOGS_INDEX = 'filebeat-grid-perf';
export const GRID_PERF_OBLT_SPACE = 'grid-perf-oblt';
export const GRID_PERF_DOC_COUNT = 10_000;
export const GRID_PERF_TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
} as const;

const KEYWORD_FIELDS = 40;
const NUMBER_FIELDS = 30;
const TEXT_FIELDS = 15;
const BOOLEAN_FIELDS = 15;
const BULK_CHUNK_SIZE = 2_000;
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'] as const;

/** Field names in mapping order; slicing it gives the selected columns of a scenario. */
export const GRID_PERF_FIELDS: readonly string[] = [
  ...Array.from({ length: KEYWORD_FIELDS }, (_, i) => `kw_${i}`),
  ...Array.from({ length: NUMBER_FIELDS }, (_, i) => `num_${i}`),
  ...Array.from({ length: TEXT_FIELDS }, (_, i) => `txt_${i}`),
  ...Array.from({ length: BOOLEAN_FIELDS }, (_, i) => `bool_${i}`),
];

const buildSentence = (seed: number, words: number): string =>
  Array.from({ length: words }, (_, i) => WORDS[(seed + i * 7) % WORDS.length]).join(' ');

const buildDocument = (index: number): Record<string, unknown> => {
  const doc: Record<string, unknown> = {
    '@timestamp': new Date(Date.parse(GRID_PERF_TIME_RANGE.from) + index * 8_000).toISOString(),
    message: buildSentence(index, 12 + (index % 30)),
  };
  for (let i = 0; i < KEYWORD_FIELDS; i++) doc[`kw_${i}`] = `value-${(index * (i + 1)) % 997}`;
  for (let i = 0; i < NUMBER_FIELDS; i++) doc[`num_${i}`] = (index * (i + 3)) % 100_000;
  for (let i = 0; i < TEXT_FIELDS; i++) doc[`txt_${i}`] = buildSentence(index + i, 4 + (i % 8));
  for (let i = 0; i < BOOLEAN_FIELDS; i++) doc[`bool_${i}`] = (index + i) % 2 === 0;
  return doc;
};

/** Creates and fills an index with deterministic documents, unless it already has them all. */
export const ensureGridPerfIndex = async (esClient: EsClient, index: string): Promise<void> => {
  if (await esClient.indices.exists({ index })) {
    const { count } = await esClient.count({ index });
    if (count === GRID_PERF_DOC_COUNT) return;
    await esClient.indices.delete({ index });
  }

  await esClient.indices.create({
    index,
    settings: { 'index.mapping.total_fields.limit': 500 },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        message: { type: 'text' },
        ...Object.fromEntries(
          GRID_PERF_FIELDS.map((field) => {
            if (field.startsWith('num_')) return [field, { type: 'long' }];
            if (field.startsWith('txt_')) return [field, { type: 'text' }];
            if (field.startsWith('bool_')) return [field, { type: 'boolean' }];
            return [field, { type: 'keyword' }];
          })
        ),
      },
    },
  });

  for (let start = 0; start < GRID_PERF_DOC_COUNT; start += BULK_CHUNK_SIZE) {
    const end = Math.min(start + BULK_CHUNK_SIZE, GRID_PERF_DOC_COUNT);
    await esClient.bulk({
      index,
      refresh: end === GRID_PERF_DOC_COUNT ? 'wait_for' : false,
      operations: Array.from({ length: end - start }, (_, i) => [
        { index: {} },
        buildDocument(start + i),
      ]).flat(),
    });
  }
};

/** Discover URL hash with an explicit data view, time range, columns, and sampling. */
export const buildDiscoverHash = ({
  dataViewId,
  columns,
  sampleSize,
  rowsPerPage,
}: {
  dataViewId: string;
  columns: readonly string[];
  sampleSize: number;
  rowsPerPage: number;
}): string => {
  const globalState = `(time:(from:'${GRID_PERF_TIME_RANGE.from}',to:'${GRID_PERF_TIME_RANGE.to}'))`;
  const appState =
    `(columns:!(${columns.join(',')}),` +
    `dataSource:(dataViewId:'${dataViewId}',type:dataView),` +
    `rowsPerPage:${rowsPerPage},sampleSize:${sampleSize},sort:!(!('@timestamp',desc)))`;
  return `/?_g=${globalState}&_a=${appState}`;
};

/**
 * Starts a rAF probe before navigation that records when the grid first shows data cells,
 * and buffers long tasks, so render timing is not skewed by Playwright polling.
 */
export const installGridRenderProbe = async (page: ScoutPage): Promise<void> => {
  await page.addInitScript(() => {
    const probe = { renderedAt: -1, longTasks: [] as Array<{ start: number; duration: number }> };
    Object.assign(window, { gridPerfProbe: probe });
    // Dev-mode Kibana loads hundreds of bundles; the default 250-entry buffer drops the searches.
    performance.setResourceTimingBufferSize(20_000);
    new PerformanceObserver((list) => {
      for (const { startTime, duration } of list.getEntries()) {
        probe.longTasks.push({ start: startTime, duration });
      }
    }).observe({ type: 'longtask', buffered: true });
    const check = () => {
      const cell = document.querySelector(
        '[data-test-subj="discoverDocTable"][data-table-loaded="true"] [data-test-subj="dataGridRowCell"]'
      );
      if (cell) {
        probe.renderedAt = performance.now();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
};

export interface GridLoadMetrics {
  /** From the end of the largest search response (the documents) until the first data cell is in the DOM. */
  renderAfterDataMs: number;
  /** Long-task time (beyond 50 ms per task) between that response and the first data cell. */
  blockingAfterDataMs: number;
  /** Raw timestamps since navigation start, to sanity-check the derived durations. */
  dataArrivedAtMs: number;
  renderedAtMs: number;
  searchRequests: number;
  largestSearchKb: number;
  renderedRowCount: number;
  /** Height of the first row, to check that the grids use the same row height. */
  rowHeightPx: number;
  gridDomNodes: number;
}

export const collectLoadMetrics = (page: ScoutPage): Promise<GridLoadMetrics> =>
  page.evaluate(() => {
    const { gridPerfProbe: probe } = window as unknown as {
      gridPerfProbe: { renderedAt: number; longTasks: Array<{ start: number; duration: number }> };
    };
    const searches = performance
      .getEntriesByType('resource')
      .filter((entry): entry is PerformanceResourceTiming =>
        /\/internal\/(b)?search/.test(entry.name)
      )
      .sort((a, b) => b.encodedBodySize - a.encodedBodySize);
    const dataArrivedAt = searches[0]?.responseEnd ?? 0;
    const table = document.querySelector('[data-test-subj="discoverDocTable"]');
    const rows = new Set(
      [...(table?.querySelectorAll('[data-grid-visible-row-index]') ?? [])].map((row) =>
        row.getAttribute('data-grid-visible-row-index')
      )
    );
    return {
      renderAfterDataMs: Math.round(probe.renderedAt - dataArrivedAt),
      blockingAfterDataMs: Math.round(
        probe.longTasks
          .filter(({ start }) => start >= dataArrivedAt && start <= probe.renderedAt)
          .reduce((total, { duration }) => total + Math.max(0, duration - 50), 0)
      ),
      dataArrivedAtMs: Math.round(dataArrivedAt),
      renderedAtMs: Math.round(probe.renderedAt),
      searchRequests: searches.length,
      largestSearchKb: Math.round((searches[0]?.encodedBodySize ?? 0) / 1024),
      renderedRowCount: rows.size,
      // A cell rather than the row: react-data-grid rows are `display: contents`.
      rowHeightPx: Math.round(
        table
          ?.querySelector(
            '[data-grid-visible-row-index="0"][role="gridcell"], [data-grid-visible-row-index="0"] [role="gridcell"]'
          )
          ?.getBoundingClientRect().height ?? 0
      ),
      gridDomNodes: table?.querySelectorAll('*').length ?? 0,
    };
  });

export interface ScrollMetrics {
  scrollerFound: boolean;
  frames: number;
  avgFps: number;
  p95FrameMs: number;
  maxFrameMs: number;
  /** Frames longer than 50 ms. */
  jankFrames: number;
  longTaskMs: number;
  distancePx: number;
}

/** Scrolls the grid's own scroll container by a fixed step on every animation frame and times the frames. */
export const measureScroll = (
  page: ScoutPage,
  { axis, durationMs, stepPx }: { axis: 'x' | 'y'; durationMs: number; stepPx: number }
): Promise<ScrollMetrics> =>
  page.evaluate(
    async ({ scrollAxis, duration, step }) => {
      const table = document.querySelector('[data-test-subj="discoverDocTable"]');
      const scrollRange = (el: Element) =>
        scrollAxis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
      const scroller = [...(table?.querySelectorAll('*') ?? [])]
        .filter((el) => {
          const overflow = getComputedStyle(el)[scrollAxis === 'y' ? 'overflowY' : 'overflowX'];
          return (overflow === 'auto' || overflow === 'scroll') && scrollRange(el) > 10;
        })
        .sort((a, b) => scrollRange(b) - scrollRange(a))[0];
      const empty = {
        scrollerFound: false,
        frames: 0,
        avgFps: 0,
        p95FrameMs: 0,
        maxFrameMs: 0,
        jankFrames: 0,
        longTaskMs: 0,
        distancePx: 0,
      };
      if (!scroller) return empty;

      const longTasks: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      observer.observe({ type: 'longtask' });

      const frameTimes: number[] = [];
      let distance = 0;
      await new Promise<void>((resolve) => {
        const startedAt = performance.now();
        let last = startedAt;
        const tick = (now: number) => {
          frameTimes.push(now - last);
          last = now;
          const max = scrollRange(scroller);
          const position = scrollAxis === 'y' ? scroller.scrollTop : scroller.scrollLeft;
          const next = position + step > max ? 0 : position + step;
          if (scrollAxis === 'y') scroller.scrollTop = next;
          else scroller.scrollLeft = next;
          distance += step;
          if (now - startedAt < duration) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      observer.disconnect();
      if (scrollAxis === 'y') scroller.scrollTop = 0;
      else scroller.scrollLeft = 0;

      const sorted = frameTimes.slice(1).sort((a, b) => a - b);
      const total = sorted.reduce((sum, ms) => sum + ms, 0);
      return {
        scrollerFound: true,
        frames: sorted.length,
        avgFps: Math.round((sorted.length / total) * 1000 * 10) / 10,
        p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
        maxFrameMs: Math.round(sorted[sorted.length - 1] ?? 0),
        jankFrames: sorted.filter((ms) => ms > 50).length,
        longTaskMs: Math.round(longTasks.reduce((sum, ms) => sum + ms, 0)),
        distancePx: distance,
      };
    },
    { scrollAxis: axis, duration: durationMs, step: stepPx }
  );

export interface SelectionMetrics {
  /** Synchronous React work inside the click handler (discrete events commit synchronously). */
  commitMs: number;
  /** Until the next frame after the click. */
  nextFrameMs: number;
}

/** Toggles the first row's selection checkbox twice and returns the slower of the two timings. */
export const measureRowSelection = (page: ScoutPage): Promise<SelectionMetrics | null> =>
  page.evaluate(async () => {
    const selector =
      '[data-test-subj="discoverDocTable"] [data-grid-visible-row-index="0"] [data-gridcell-column-id="select"] input[type="checkbox"]';
    const toggle = async () => {
      const checkbox = document.querySelector<HTMLInputElement>(selector);
      if (!checkbox) return null;
      const startedAt = performance.now();
      checkbox.click();
      const committedAt = performance.now();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return { commitMs: committedAt - startedAt, nextFrameMs: performance.now() - startedAt };
    };
    const select = await toggle();
    const deselect = await toggle();
    if (!select || !deselect) return null;
    return {
      commitMs: Math.round(Math.max(select.commitMs, deselect.commitMs) * 10) / 10,
      nextFrameMs: Math.round(Math.max(select.nextFrameMs, deselect.nextFrameMs) * 10) / 10,
    };
  });

/** Median of each numeric field across runs (non-numeric fields are taken from the first run). */
export const medianOf = <T extends object>(runs: readonly T[]): T => {
  const records = runs as ReadonlyArray<Record<string, unknown>>;
  const [first] = records;
  const result: Record<string, unknown> = { ...first };
  for (const key of Object.keys(first)) {
    const values = records.map((run) => run[key]);
    if (values.every((value): value is number => typeof value === 'number')) {
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      result[key] = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    } else if (
      values.every((value): value is object => Boolean(value) && typeof value === 'object')
    ) {
      result[key] = medianOf(values);
    }
  }
  return result as T;
};
