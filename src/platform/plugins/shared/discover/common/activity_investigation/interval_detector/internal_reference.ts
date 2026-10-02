/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWindowParameters } from '@kbn/aiops-log-rate-analysis';

export interface ActivityInterval {
  readonly start: number;
  readonly end: number;
}

export interface InternalIntervalCandidate extends ActivityInterval {
  readonly reference: ActivityInterval;
  readonly observed: number;
  readonly referenceObserved: number;
  readonly referenceMean: number;
  readonly expectedFromInternalReference: number;
  readonly excess: number;
  readonly relativeIncrease: number;
}

export interface InternalReferenceFunnel {
  readonly intervals: number;
  readonly insufficientReference: number;
  readonly zeroReference: number;
  readonly notAnInternalIncrease: number;
  readonly internalCandidates: number;
}

export interface InternalReferenceConfig {
  readonly nominalBucketMs: number;
  readonly minReferenceBuckets: number;
  readonly minRelativeIncrease: number;
}

export const prefixSums = (counts: readonly number[]): number[] => {
  const prefix = [0];
  for (const count of counts) prefix.push(prefix[prefix.length - 1] + count);

  return prefix;
};

/** Lists the proper intervals that rise above their preceding reference window, largest excess first. */
export const getInternalIntervalCandidates = (
  counts: readonly number[],
  { nominalBucketMs, minReferenceBuckets, minRelativeIncrease }: InternalReferenceConfig
): { candidates: InternalIntervalCandidate[]; funnel: InternalReferenceFunnel } => {
  const bucketCount = counts.length;
  const prefix = prefixSums(counts);
  const candidates: InternalIntervalCandidate[] = [];
  let intervals = 0;
  let insufficientReference = 0;
  let zeroReference = 0;
  let notAnInternalIncrease = 0;

  for (let start = 0; start < bucketCount; start++) {
    // AIOps windows on bucket units at the validated scale, so the reference stays a fixed share of the view.
    const { baselineMin, baselineMax } = getWindowParameters(
      start * nominalBucketMs,
      0,
      bucketCount * nominalBucketMs,
      (start + 1) * nominalBucketMs,
      nominalBucketMs
    );
    const referenceEnd = Math.max(0, Math.min(start, Math.floor(baselineMax / nominalBucketMs)));
    const referenceStart = Math.min(
      referenceEnd,
      Math.max(0, Math.ceil(baselineMin / nominalBucketMs))
    );
    const referenceBuckets = referenceEnd - referenceStart;
    const referenceObserved = prefix[referenceEnd] - prefix[referenceStart];
    const referenceMean = referenceBuckets ? referenceObserved / referenceBuckets : 0;

    for (let end = start + 1; end <= bucketCount; end++) {
      if (start === 0 && end === bucketCount) continue;
      intervals++;
      if (referenceBuckets < minReferenceBuckets) {
        insufficientReference++;
        continue;
      }
      if (referenceObserved === 0) {
        zeroReference++;
        continue;
      }
      const observed = prefix[end] - prefix[start];
      const observedMean = observed / (end - start);
      if (observedMean - referenceMean <= referenceMean * minRelativeIncrease) {
        notAnInternalIncrease++;
        continue;
      }
      const expectedFromInternalReference = referenceMean * (end - start);
      candidates.push({
        start,
        end,
        reference: { start: referenceStart, end: referenceEnd },
        observed,
        referenceObserved,
        referenceMean,
        expectedFromInternalReference,
        excess: observed - expectedFromInternalReference,
        relativeIncrease: (observedMean - referenceMean) / referenceMean,
      });
    }
  }

  candidates.sort(
    (left, right) =>
      right.excess - left.excess ||
      right.end - right.start - (left.end - left.start) ||
      right.end - left.end
  );

  return {
    candidates,
    funnel: {
      intervals,
      insufficientReference,
      zeroReference,
      notAnInternalIncrease,
      internalCandidates: candidates.length,
    },
  };
};
