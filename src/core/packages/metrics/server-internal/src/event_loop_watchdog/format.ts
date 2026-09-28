/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsVersion } from '@elastic/ecs';
import type { BlockReport, Candidate, LiveNoticeFormat } from './types';

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
        `${kind} ${type} [${id}] (started ${startedBeforeBlockMs}ms before the block)`
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
  `Event loop still blocked after ${elapsedMs}ms (notice ${count}/${maxCount}). Candidates (in flight, not necessarily the cause): ${formatCandidates(
    candidates,
    omittedCandidates
  )}`;

export const formatReportMessage = (report: BlockReport): string => {
  const { blockedMs, cpuRatio, profile, candidates, omittedCandidates, suppressedBlocks } = report;
  const cpu = cpuRatio === undefined ? '' : `, process CPU ratio ${cpuRatio}`;
  const frames =
    profile.frames.length > 0
      ? ` Top frames: ${profile.frames
          .map(
            ({ functionName, location, selfTimeMs, selfPercent, callers }) =>
              `${functionName}${location ? ` (${location})` : ''} ${selfTimeMs}ms ${selfPercent}%${
                callers.length > 0 ? ` via ${callers.join(' < ')}` : ''
              }`
          )
          .join('; ')}.`
      : '';
  const suppressed =
    suppressedBlocks > 0 ? ` ${suppressedBlocks} earlier block(s) were not reported.` : '';
  return (
    `Event loop was blocked for ~${blockedMs}ms${cpu}. Profile ${profile.verdict}: ${profile.reason}.${frames}` +
    ` Candidates (in flight, not necessarily the cause): ${formatCandidates(
      candidates,
      omittedCandidates
    )}.${suppressed}`
  );
};

const TEXT_LEVEL = 'WARN ';

/**
 * Formats a single log line written directly by the worker, approximating the configured
 * console layout (ECS JSON or plain text) since core logging runs on the blocked main thread.
 */
export const formatLogLine = (
  format: LiveNoticeFormat,
  loggerName: string,
  message: string,
  meta: Record<string, object>,
  now: Date = new Date()
): string => {
  if (format === 'json') {
    return `${JSON.stringify({
      '@timestamp': now.toISOString(),
      ecs: { version: EcsVersion },
      log: { level: 'WARN', logger: loggerName },
      message,
      process: { pid: process.pid, uptime: process.uptime() },
      ...meta,
    })}\n`;
  }
  return `[${now.toISOString()}][${TEXT_LEVEL}][${loggerName}] ${message}\n`;
};
