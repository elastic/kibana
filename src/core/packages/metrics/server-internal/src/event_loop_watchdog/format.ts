/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BlockReport, Candidate, ProfileSummary } from './types';

export interface LiveNotice {
  elapsedMs: number;
  count: number;
  maxCount: number;
  candidates: Candidate[];
  omittedCandidates: number;
}

export const formatCandidates = (candidates: Candidate[], omitted: number): string => {
  if (candidates.length === 0) return 'none tracked';
  const listed = candidates
    .map(
      ({ kind, type, id, startedBeforeBlockMs }) =>
        `${kind} ${type} [${id}] started ${startedBeforeBlockMs}ms before the block`
    )
    .join(', ');
  return omitted > 0 ? `${listed} and ${omitted} more` : listed;
};

export const formatLiveNoticeMessage = ({
  elapsedMs,
  count,
  maxCount,
  candidates,
  omittedCandidates,
}: LiveNotice): string =>
  `Event loop still blocked after ${elapsedMs}ms, notice ${count}/${maxCount}. Candidates: ${formatCandidates(
    candidates,
    omittedCandidates
  )}`;

const formatProfile = (profile: ProfileSummary): string => {
  const { verdict, reason, frames, startAckLatencyMs } = profile;
  let startLatency = '';
  if (startAckLatencyMs !== undefined) {
    startLatency =
      verdict === 'profiled'
        ? ` (starting the profiler added up to ~${startAckLatencyMs}ms to the block)`
        : ` (profiler start acknowledged after ~${startAckLatencyMs}ms)`;
  }
  const topFrames =
    frames.length > 0
      ? ` Top frames: ${frames
          .map(
            ({ functionName, location, selfTimeMs, selfPercent, callers }) =>
              `${functionName}${location ? ` (${location})` : ''} ${selfTimeMs}ms ${selfPercent}%${
                callers.length > 0 ? ` via ${callers.join(' < ')}` : ''
              }`
          )
          .join('; ')}.`
      : '';
  return ` Profile ${verdict}${startLatency}: ${reason}.${topFrames}`;
};

export const formatReportMessage = ({
  blockedMs,
  candidates,
  omittedCandidates,
  suppressedBlocks,
  profile,
}: BlockReport): string => {
  const suppressed =
    suppressedBlocks > 0 ? ` ${suppressedBlocks} earlier block(s) were not reported.` : '';
  return (
    `Event loop blocked for ~${blockedMs}ms.${profile ? formatProfile(profile) : ''}` +
    ` Candidates: ${formatCandidates(candidates, omittedCandidates)}.${suppressed}`
  );
};
