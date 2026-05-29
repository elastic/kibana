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

const DEPLOY_INDEX = 16;

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
