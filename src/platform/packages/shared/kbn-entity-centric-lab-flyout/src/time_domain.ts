/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared time domain for every chart in the entity-centric lab flyout.
 *
 * The PayFlow demo storyline is anchored on the v2.14.3 deployment at
 * `2026-04-14T02:46:41Z`. We render every chart on a fixed 24-point grid,
 * 20 seconds apart, with index 16 pinned to the deployment timestamp.
 *
 * That gives a chart window of roughly 02:41:21 → 02:49:01, with the spike
 * concentrated in the last third of the X axis — visually consistent with
 * the log lines, alert timestamps, and AI summary copy that all reference
 * 02:46-02:47.
 *
 * The generic / off-story tabs share the same domain so the X-axis tick
 * formatter in `metrics_tab.tsx` / `alerts_tab.tsx` only ever has to handle
 * one shape of value (epoch milliseconds).
 */

import datemath from '@kbn/datemath';

export const INCIDENT_TIMELINE_LENGTH = 24;

/** Sample interval between adjacent points on the X axis. */
export const INCIDENT_STEP_MS = 20 * 1000;

/**
 * Timestamp at which the PayFlow v2.14.3 deployment landed. Used both as the
 * X coordinate of the deployment event annotation and as the anchor for the
 * 24-point chart domain (deployment lives at index 16 of 24, so the post-
 * incident region — indices 16..23 — fills the last third of the chart).
 */
export const INCIDENT_DEPLOY_TIME_MS = Date.UTC(2026, 3, 14, 2, 46, 41);

/** Index of the v2.14.3 deployment on {@link INCIDENT_X_DOMAIN}. */
export const INCIDENT_DEPLOY_INDEX = 16;

const DEPLOY_INDEX = INCIDENT_DEPLOY_INDEX;

/**
 * 24 evenly-spaced timestamps that every chart in the flyout uses as its X
 * domain. The array is computed once at module load and reused everywhere
 * so all charts line up perfectly under the deployment marker.
 */
export const INCIDENT_X_DOMAIN: readonly number[] = Array.from(
  { length: INCIDENT_TIMELINE_LENGTH },
  (_, i) => INCIDENT_DEPLOY_TIME_MS + (i - DEPLOY_INDEX) * INCIDENT_STEP_MS
);

/**
 * Format an epoch-millisecond X value as a UTC `HH:MM:SS` axis tick label.
 * Centralised here so both the Metrics and Alerts tabs render identical
 * tick formatting.
 */
export const formatIncidentTick = (value: number): string => {
  const date = new Date(value);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

/** Absolute bounds of the flyout time picker. */
export interface ResolvedTimeRange {
  readonly startMs: number;
  readonly endMs: number;
}

const incidentEndMs = (): number => INCIDENT_X_DOMAIN[INCIDENT_X_DOMAIN.length - 1];

/**
 * Parse a Kibana date-math range (`now-15m`, an absolute timestamp, …).
 * Returns undefined when either side does not parse or the range is empty.
 */
export const resolveTimeRange = (from: string, to: string): ResolvedTimeRange | undefined => {
  const start = datemath.parse(from);
  const end = datemath.parse(to, { roundUp: true });
  if (!start?.isValid() || !end?.isValid()) return undefined;
  const startMs = start.valueOf();
  const endMs = end.valueOf();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return undefined;
  return { startMs, endMs };
};

/**
 * The canned story ends when the selected range ends, so "last 15 minutes"
 * shows the incident as what just happened and a wider range leaves the
 * earlier part of the window empty.
 */
export const incidentShiftMs = (range: ResolvedTimeRange): number =>
  range.endMs - incidentEndMs();

/** How many equal slices the phase heatmap draws across the selected range. */
export const PHASE_BUCKET_COUNT = INCIDENT_TIMELINE_LENGTH;

/** Phase sample that falls before the incident. The heatmap paints it as no data. */
export const PHASE_NO_DATA = -1;

/**
 * Move incident samples onto the selected range. Points before the range
 * are dropped. When the range cuts into the incident, the value at the cut
 * is held to the range edge so the line still starts on the axis.
 */
export const windowPoints = (
  points: readonly MetricPoint[],
  range: ResolvedTimeRange
): MetricPoint[] => {
  if (points.length === 0) return [];
  const shift = incidentShiftMs(range);
  const shifted = points
    .map((point) => ({ x: point.x + shift, y: point.y }))
    .sort((a, b) => a.x - b.x);
  const firstX = shifted[0].x;
  const lastX = shifted[shifted.length - 1].x;
  const inside = shifted.filter((point) => point.x >= range.startMs && point.x <= range.endMs);
  const windowed: MetricPoint[] = [];
  if (range.startMs > firstX) {
    const prior = [...shifted].reverse().find((point) => point.x <= range.startMs);
    if (prior && (inside.length === 0 || inside[0].x > range.startMs)) {
      windowed.push({ x: range.startMs, y: prior.y });
    }
  }
  windowed.push(...inside);
  const last = windowed[windowed.length - 1];
  if (last && last.x < range.endMs && range.endMs <= lastX) {
    windowed.push({ x: range.endMs, y: last.y });
  }
  return windowed;
};

/**
 * One phase rectangle per equal slice of the selected range. Slices before
 * the incident are {@link PHASE_NO_DATA}; later slices hold the last phase
 * at or before the slice midpoint.
 */
export const phaseBucketsForRange = (
  points: readonly MetricPoint[],
  range: ResolvedTimeRange
): MetricPoint[] => {
  if (points.length === 0) return [];
  const shift = incidentShiftMs(range);
  const shifted = points
    .map((point) => ({ x: point.x + shift, y: point.y }))
    .sort((a, b) => a.x - b.x);
  const span = range.endMs - range.startMs;
  const valueAt = (time: number): number => {
    if (time < shifted[0].x) return PHASE_NO_DATA;
    let y = shifted[0].y;
    for (const point of shifted) {
      if (point.x <= time) y = point.y;
      else break;
    }
    return y;
  };
  return Array.from({ length: PHASE_BUCKET_COUNT }, (_, index) => {
    const start = range.startMs + (index / PHASE_BUCKET_COUNT) * span;
    const mid = start + span / PHASE_BUCKET_COUNT / 2;
    return { x: Math.round(start), y: valueAt(mid) };
  });
};

export interface MetricPoint {
  readonly x: number;
  readonly y: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Parse the flyout's canned timestamp strings (`Apr 14, 2026 @ 02:46:41.012`). */
export const parseFlyoutTimestamp = (value: string): number | undefined => {
  const match =
    /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})(?:,| @) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(
      value.trim()
    );
  if (!match) return undefined;
  const month = MONTHS[match[1]];
  if (month === undefined) return undefined;
  const fraction = (match[7] ?? '0').padEnd(3, '0');
  return Date.UTC(
    Number(match[3]),
    month,
    Number(match[2]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    Number(fraction)
  );
};

export const formatFlyoutTimestamp = (ms: number): string => {
  const date = new Date(ms);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0');
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} @ ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
};

/**
 * Rewrite a list of timestamped rows onto the selected range. Rows that
 * sit on the incident clock move with the charts. Any other list is
 * anchored so its latest row lands at the end of the range, and rows that
 * then fall outside the range are dropped.
 */
export const windowLabeledTimes = <T,>(
  rows: readonly T[],
  read: (row: T) => string,
  write: (row: T, timestamp: string) => T,
  range: ResolvedTimeRange
): readonly T[] => {
  const parsed = rows.map((row) => ({ row, ms: parseFlyoutTimestamp(read(row)) }));
  const known = parsed.filter((item): item is { row: T; ms: number } => item.ms !== undefined);
  if (known.length === 0) return rows;

  const incidentShift = incidentShiftMs(range);
  const coversRange = (shift: number): boolean =>
    known.some((item) => {
      const at = item.ms + shift;
      return at >= range.startMs && at <= range.endMs;
    });
  const shift = coversRange(incidentShift)
    ? incidentShift
    : range.endMs - Math.max(...known.map((item) => item.ms));

  return parsed.flatMap((item) => {
    if (item.ms === undefined) return [item.row];
    const at = item.ms + shift;
    if (at < range.startMs || at > range.endMs) return [];
    return [write(item.row, formatFlyoutTimestamp(at))];
  });
};
