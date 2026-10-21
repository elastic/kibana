/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Pure summaries for the production-shape memory run. No I/O. */

export const MIB = 1024 * 1024;
export const GIB = 1024 * MIB;

/** Inclusive nearest-rank percentile. `p` is 0–100. */
export const percentile = (values, p) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('percentile requires a non-empty array');
  }
  if (p < 0 || p > 100) throw new Error('percentile p must be between 0 and 100');
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
};

/**
 * How many additional islands fit in `limitBytes` given a main-only RSS and a
 * per-island RSS delta. Zero when main alone exceeds the limit.
 */
export const slotsThatFit = (mainRss, marginalRss, limitBytes) => {
  if (mainRss > limitBytes) return 0;
  if (marginalRss <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor((limitBytes - mainRss) / marginalRss);
};

/**
 * Resident class mix. `6/3/1` is Track 4 shape C (6 alerting, 3 workflow, 1 agent).
 * `2/2/1` is Track 4 shape A. Missing class bytes stay null; the sum is null.
 */
export const mixBytes = (shape, perClass) => {
  const counts =
    shape === '6/3/1'
      ? { alerting: 6, workflow: 3, agent: 1 }
      : { alerting: 2, workflow: 2, agent: 1 };
  if (shape !== '6/3/1' && shape !== '2/2/1') throw new Error(`unknown shape ${shape}`);
  const parts = ['alerting', 'workflow', 'agent'].map((name) => {
    const bytes = perClass[name];
    if (bytes == null) return null;
    return counts[name] * bytes;
  });
  if (parts.some((part) => part == null)) return null;
  return parts.reduce((sum, part) => sum + part, 0);
};

/**
 * Scale Track 4's uninitialised per-family heap by the measured alerting
 * initialised/uninitialised ratio. Returns null when the ratio cannot be formed.
 */
export const scaleFamily = (track4FamilyBytes, track4AlertingBytes, measuredAlertingBytes) => {
  if (track4AlertingBytes <= 0 || measuredAlertingBytes == null || track4FamilyBytes == null)
    return null;
  return (track4FamilyBytes * measuredAlertingBytes) / track4AlertingBytes;
};
