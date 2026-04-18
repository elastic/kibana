#!/usr/bin/env node
/**
 * Real-time terminal chart for Kibana memory profile CSV files.
 *
 * Usage:
 *   node plot_memory_profile_csv.mjs <path-to.csv>
 *
 * Charts sample sequence on the horizontal axis (left → right) and
 * heap_used / v8_total_heap_size on the vertical axis (high at top). Y-axis
 * is fixed from 500 to 2000 MiB (mebibytes × 1024²); values outside clip.
 * Header shows heap_used and v8_total_heap now/max (red / yellow).
 * Re-reads the file every second
 * so appended rows appear live. Exit with Ctrl+C.
 */

import fs from 'fs';
import path from 'path';

const REFRESH_MS = 500;

/** Fixed Y-axis range (mebibytes × 1024²). */
const Y_AXIS_MIN_BYTES = 900 * 1024 * 1024;
const Y_AXIS_MAX_BYTES = 1400 * 1024 * 1024;

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node plot_memory_profile_csv.mjs <csv-file>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), csvPath);

/** @typedef {{ sequence: number; heapUsed: number; v8TotalHeap: number }} SampleRow */

/**
 * @param {string} content
 * @returns {{ rows: SampleRow[]; error?: string }}
 */
function parseMemoryProfileCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: lines.length === 0 ? 'empty file' : 'header only' };
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const col = (names) => {
    for (const name of names) {
      const i = header.indexOf(name);
      if (i !== -1) return i;
    }
    return -1;
  };

  const idxSeq = col(['sequence']);
  const idxHeap = col(['heap_used']);
  const idxV8 = col(['v8_total_heap_size', 'v8_total_heap']);

  if (idxHeap === -1 || idxV8 === -1) {
    return {
      rows: [],
      error: `missing columns (need heap_used and v8_total_heap_size). Found: ${header.join(', ')}`,
    };
  }

  /** @type {SampleRow[]} */
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = lines[li].split(',');
    if (parts.length < header.length) continue;

    const sequence = idxSeq === -1 ? li : Number(parts[idxSeq]);
    const heapUsed = Number(parts[idxHeap]);
    const v8TotalHeap = Number(parts[idxV8]);

    if (!Number.isFinite(heapUsed) || !Number.isFinite(v8TotalHeap)) continue;
    rows.push({
      sequence: Number.isFinite(sequence) ? sequence : li,
      heapUsed,
      v8TotalHeap,
    });
  }

  return { rows };
}

/**
 * Whole mebibytes for axis ticks (matches 500–2000M scale).
 * @param {number} bytes
 * @returns {string}
 */
function formatAxisMebibytes(bytes) {
  if (!Number.isFinite(bytes)) return '?';
  return `${Math.round(bytes / (1024 * 1024))}M`;
}

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/**
 * @param {SampleRow[]} allRows
 */
function drawChart(allRows) {
  const cols = process.stdout.columns ?? 80;
  const termRows = process.stdout.rows ?? 24;

  const reservedTop = 2;
  const reservedBottom = 2;
  const labelCol = 9;
  const chartHeight = Math.max(1, termRows - reservedTop - reservedBottom);
  const chartWidth = Math.max(10, cols - labelCol - 1);

  const visible =
    allRows.length > chartWidth ? allRows.slice(-chartWidth) : allRows;

  /** @type {string[][]} */
  const grid = Array.from({ length: chartHeight }, () =>
    Array.from({ length: chartWidth }, () => ' ')
  );

  const minV = Y_AXIS_MIN_BYTES;
  const maxV = Y_AXIS_MAX_BYTES;

  /** Map memory (bytes) to row index; top row = max memory. Clips to Y-axis range. */
  const scaleY = (value) => {
    const clamped = Math.min(maxV, Math.max(minV, value));
    const t = (maxV - clamped) / (maxV - minV);
    return Math.min(chartHeight - 1, Math.max(0, Math.round(t * (chartHeight - 1))));
  };

  for (let col = 0; col < visible.length; col++) {
    const sample = visible[col];
    const yh = scaleY(sample.heapUsed);
    const yv = scaleY(sample.v8TotalHeap);
    if (yh === yv) {
      grid[yh][col] = '█';
    } else {
      grid[yh][col] = '█';
      grid[yv][col] = '▒';
    }
  }

  /** Five Y-axis ticks: top = max, bottom = min, evenly spaced by row. */
  const yAxisTickRowSet = new Set(
    [0, 1, 2, 3, 4].map((k) => Math.round((k / 4) * (chartHeight - 1)))
  );

  /**
   * @param {number} row
   * @returns {string}
   */
  const yAxisLabelForRow = (row) => {
    if (!yAxisTickRowSet.has(row)) return '';
    const t = chartHeight <= 1 ? 0 : row / (chartHeight - 1);
    const value = maxV - (maxV - minV) * t;
    return formatAxisMebibytes(value);
  };

  const lastHeapUsed =
    allRows.length > 0 ? allRows[allRows.length - 1].heapUsed : NaN;
  const maxHeapUsed = allRows.length
    ? allRows.reduce((acc, r) => Math.max(acc, r.heapUsed), allRows[0].heapUsed)
    : NaN;
  const lastV8TotalHeap =
    allRows.length > 0 ? allRows[allRows.length - 1].v8TotalHeap : NaN;
  const maxV8TotalHeap = allRows.length
    ? allRows.reduce((acc, r) => Math.max(acc, r.v8TotalHeap), allRows[0].v8TotalHeap)
    : NaN;
  const heapStat = (bytes) =>
    Number.isFinite(bytes) ? formatAxisMebibytes(bytes) : '—';

  const linesOut = [];
  linesOut.push(
    `${ansi.bold}${ansi.cyan}Memory profile${ansi.reset} ${ansi.dim}${path.basename(resolvedPath)}${ansi.reset} ` +
      `${ansi.dim}|${ansi.reset} ${allRows.length} sample(s) ` +
      `${ansi.dim}|${ansi.reset} ${ansi.red}heap_used${ansi.reset} ${ansi.dim}now${ansi.reset} ${ansi.red}${ansi.bold}${heapStat(lastHeapUsed)}${ansi.reset} ` +
      `${ansi.dim}max${ansi.reset} ${ansi.red}${ansi.bold}${heapStat(maxHeapUsed)}${ansi.reset} ` +
      `${ansi.dim}|${ansi.reset} ${ansi.yellow}v8_total_heap${ansi.reset} ${ansi.dim}now${ansi.reset} ${ansi.yellow}${ansi.bold}${heapStat(lastV8TotalHeap)}${ansi.reset} ` +
      `${ansi.dim}max${ansi.reset} ${ansi.yellow}${ansi.bold}${heapStat(maxV8TotalHeap)}${ansi.reset}`
  );


  for (let y = 0; y < chartHeight; y++) {
    const tick = yAxisLabelForRow(y);
    const seqLabel = tick.padStart(labelCol - 1, ' ').slice(-(labelCol - 1));
    const cells = grid[y]
      .map((ch) => {
        if (ch === '█') return `${ansi.red}${ch}${ansi.reset}`;
        if (ch === '▒') return `${ansi.yellow}${ch}${ansi.reset}`;
        return `${ansi.dim}·${ansi.reset}`;
      })
      .join('');
    linesOut.push(`${ansi.dim}${seqLabel} │${ansi.reset}${cells}`);
  }

  const seqLeft = visible.length ? String(visible[0].sequence) : '—';
  const seqRight = visible.length ? String(visible[visible.length - 1].sequence) : '—';
  const xAxisLine = `${ansi.dim}${' '.repeat(labelCol)}└${'─'.repeat(chartWidth)}${ansi.reset}`;
  const seqPad = Math.max(0, chartWidth - seqLeft.length - seqRight.length);
  const xLabels = `${' '.repeat(labelCol)}${ansi.dim}${seqLeft}${' '.repeat(seqPad)}${seqRight}${ansi.reset}`;

  linesOut.push(xAxisLine);
  linesOut.push(xLabels);

  const frame = linesOut.join('\n');
  process.stdout.write(`\x1b[2J\x1b[H${frame}`);
}

function tick() {
  try {
    if (!fs.existsSync(resolvedPath)) {
      process.stdout.write(
        `\x1b[2J\x1b[H${ansi.dim}Waiting for file…${ansi.reset}\n${resolvedPath}\n`
      );
      return;
    }
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const { rows, error } = parseMemoryProfileCsv(content);
    if (error && rows.length === 0) {
      process.stdout.write(`\x1b[2J\x1b[H${ansi.dim}${error}${ansi.reset}\n`);
      return;
    }
    drawChart(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`\x1b[2J\x1b[H${ansi.bold}Error:${ansi.reset} ${msg}\n`);
  }
}

process.stdout.write('\x1b[?25l');
tick();
const interval = setInterval(tick, REFRESH_MS);

function shutdown() {
  clearInterval(interval);
  process.stdout.write(`\x1b[?25h\x1b[2J\x1b[H${ansi.dim}Stopped.${ansi.reset}\n`);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
