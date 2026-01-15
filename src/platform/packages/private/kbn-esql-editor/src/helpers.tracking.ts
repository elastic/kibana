/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface BaseTracking {
  hasFirstSample: boolean;
  startTime: number;
  queryLength: number;
  queryLines: number;
  interactionId: number;
}

export interface SuggestionsTracking extends BaseTracking {
  computeStart: number;
  computeEnd: number;
}

// First event always captured. Subsequent events use deterministic sampling
// based on interactionId (every Nth interaction is sampled).
export const shouldSkipLatencySampling = (
  tracking: BaseTracking,
  interactionId: number,
  sampleRatePercent: number = 10
): boolean => {
  if (tracking.startTime > 0) {
    return true;
  }

  if (!tracking.hasFirstSample) {
    return false;
  }

  if (sampleRatePercent >= 100) {
    return false;
  }

  const bucketSize = Math.max(1, Math.round(100 / sampleRatePercent));

  return interactionId % bucketSize !== 0;
};

export const startLatencyTracking = (
  tracking: BaseTracking,
  queryText: string,
  interactionId: number
): void => {
  tracking.startTime = performance.now();
  tracking.queryLength = queryText.length;
  tracking.queryLines = queryText.split('\n').length;
  tracking.interactionId = interactionId;
};

interface LatencyTrackingResult {
  duration: number;
  queryLength: number;
  queryLines: number;
  interactionId: number;
  isInitialLoad: boolean;
}

interface SuggestionsLatencyResult extends LatencyTrackingResult {
  keystrokeToTriggerDuration: number;
  computeDuration: number;
}

export const endLatencyTracking = (tracking: BaseTracking): LatencyTrackingResult | null => {
  if (tracking.startTime <= 0) {
    return null;
  }

  const result: LatencyTrackingResult = {
    duration: performance.now() - tracking.startTime,
    queryLength: tracking.queryLength,
    queryLines: tracking.queryLines,
    interactionId: tracking.interactionId,
    isInitialLoad: !tracking.hasFirstSample,
  };

  tracking.hasFirstSample = true;
  resetTracking(tracking);

  return result;
};

const resetSuggestionsFields = (tracking: SuggestionsTracking): void => {
  tracking.computeStart = 0;
  tracking.computeEnd = 0;
};

// Drop measurements where keystroke→compute time exceeds this threshold (likely stale/unrelated)
const STALE_THRESHOLD_MS = 10000;

export const endSuggestionsLatencyTracking = (
  tracking: SuggestionsTracking
): SuggestionsLatencyResult | null => {
  const { computeStart, computeEnd, startTime } = tracking;

  if (computeStart === 0 || computeEnd === 0) {
    return null;
  }

  const baseResult = endLatencyTracking(tracking);

  if (!baseResult) {
    resetSuggestionsFields(tracking);
    return null;
  }

  // Best-effort: keystroke timing is captured in the editor and can be stale or
  // negative if the provider runs before the change event; we drop outliers.
  const keystrokeToTriggerDuration = computeStart - startTime;
  const computeDuration = computeEnd - computeStart;

  resetSuggestionsFields(tracking);

  // Guard against timing mismatches (negative values) or stale measurements (> threshold)
  if (
    keystrokeToTriggerDuration < 0 ||
    keystrokeToTriggerDuration > STALE_THRESHOLD_MS ||
    computeDuration < 0
  ) {
    return null;
  }

  return {
    ...baseResult,
    keystrokeToTriggerDuration,
    computeDuration,
  };
};

export const resetTracking = (tracking: BaseTracking): void => {
  tracking.startTime = 0;
  tracking.queryLength = 0;
  tracking.queryLines = 0;
  tracking.interactionId = 0;
};
