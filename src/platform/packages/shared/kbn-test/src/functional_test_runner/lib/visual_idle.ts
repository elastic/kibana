/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitRecorder } from './wait_recorder';

type WaitReport = ReturnType<WaitRecorder['getReport']>;

export interface VisualInterval {
  startMs: number;
  endMs: number;
}

interface VisualSummary {
  durationMs: number;
  unchangedScreenMs: number;
  unchangedPercent: number;
  longestUnchangedMs: number;
  unobservedMs: number;
  waitOverlapMs: number;
  sleepAndBackoffOverlapMs: number;
}

export interface VisualIdleReport extends VisualSummary {
  version: number;
  config: string;
  testResult: WaitReport['result'];
  intervals: Array<
    VisualInterval & {
      overlappingWaits: Array<{
        category: WaitReport['waits'][number]['category'];
        name: string;
        runnableId?: number;
        stack: string;
        overlapMs: number;
      }>;
    }
  >;
  captureGaps: VisualInterval[];
  runnables: Array<
    VisualSummary &
      Pick<WaitReport['runnables'][number], 'id' | 'type' | 'title' | 'file' | 'result'>
  >;
  files: Array<VisualSummary & { file: string }>;
}

const union = (intervals: readonly VisualInterval[], mergeAdjacent = false): VisualInterval[] => {
  const result: VisualInterval[] = [];
  for (const interval of [...intervals].sort((a, b) => a.startMs - b.startMs)) {
    if (interval.endMs <= interval.startMs) continue;
    const last = result[result.length - 1];
    if (
      last &&
      (interval.startMs < last.endMs || (mergeAdjacent && interval.startMs === last.endMs))
    ) {
      last.endMs = Math.max(last.endMs, interval.endMs);
    } else {
      result.push({ ...interval });
    }
  }
  return result;
};

const intersect = (
  intervals: readonly VisualInterval[],
  bounds: readonly VisualInterval[]
): VisualInterval[] =>
  union(
    intervals.flatMap((interval) =>
      union(
        bounds.map((bound) => ({
          startMs: Math.max(interval.startMs, bound.startMs),
          endMs: Math.min(interval.endMs, bound.endMs),
        })),
        true
      )
    )
  );

const duration = (intervals: readonly VisualInterval[]): number =>
  union(intervals).reduce((total, interval) => total + interval.endMs - interval.startMs, 0);

/** Parses FFmpeg freeze boundaries, including a freeze continuing through EOF. */
export const parseFreezeIntervals = (log: string, durationMs: number): VisualInterval[] => {
  const intervals: VisualInterval[] = [];
  let startMs: number | undefined;
  for (const match of log.matchAll(/lavfi\.freezedetect\.freeze_(start|end):\s*([\d.eE+-]+)/g)) {
    const timeMs = Number(match[2]) * 1000;
    if (!Number.isFinite(timeMs)) continue;
    if (match[1] === 'start') {
      startMs = Math.max(0, timeMs);
    } else if (startMs !== undefined) {
      intervals.push({ startMs, endMs: Math.min(durationMs, timeMs) });
      startMs = undefined;
    }
  }
  if (startMs !== undefined) intervals.push({ startMs, endMs: durationMs });
  return union(intervals);
};

/** Excludes unobserved capture gaps from visual inactivity measurements. */
export const excludeCaptureGaps = (
  intervals: readonly VisualInterval[],
  gaps: readonly VisualInterval[]
): VisualInterval[] => {
  let result = union(intervals);
  for (const gap of union(gaps)) {
    result = result.flatMap((interval) => {
      if (gap.endMs <= interval.startMs || gap.startMs >= interval.endMs) return [interval];
      return [
        { startMs: interval.startMs, endMs: Math.min(interval.endMs, gap.startMs) },
        { startMs: Math.max(interval.startMs, gap.endMs), endMs: interval.endMs },
      ].filter(({ startMs, endMs }) => endMs > startMs);
    });
  }
  return result;
};

/** Attributes sampled unchanged-screen intervals to the existing FTR timeline. */
export const summarizeVisualIdle = (
  report: WaitReport,
  freezes: readonly VisualInterval[],
  captureGaps: readonly VisualInterval[]
): VisualIdleReport => {
  const intervals = intersect(excludeCaptureGaps(freezes, captureGaps), [
    { startMs: 0, endMs: report.durationMs },
  ]);
  const measuredWaits = report.waits.filter(({ category }) => category !== 'retry');
  const summarize = (
    bounds: readonly VisualInterval[],
    owners?: ReadonlySet<number>
  ): VisualSummary => {
    const clipped = intersect(intervals, bounds);
    const durationMs = duration(bounds);
    const unchangedScreenMs = duration(clipped);
    const ownedWaits = owners
      ? measuredWaits.filter(({ runnableId }) => runnableId !== undefined && owners.has(runnableId))
      : measuredWaits;
    return {
      durationMs,
      unchangedScreenMs,
      unchangedPercent: durationMs ? (unchangedScreenMs / durationMs) * 100 : 0,
      longestUnchangedMs: clipped.reduce(
        (maximum, { startMs, endMs }) => Math.max(maximum, endMs - startMs),
        0
      ),
      unobservedMs: duration(intersect(captureGaps, bounds)),
      waitOverlapMs: duration(intersect(clipped, ownedWaits)),
      sleepAndBackoffOverlapMs: duration(
        intersect(
          clipped,
          ownedWaits.filter(({ category }) => ['sleep', 'retryDelay'].includes(category))
        )
      ),
    };
  };
  return {
    version: 1,
    config: report.config,
    testResult: report.result,
    ...summarize([{ startMs: 0, endMs: report.durationMs }]),
    intervals: intervals.map((interval) => ({
      ...interval,
      overlappingWaits: measuredWaits.flatMap((wait) => {
        const overlapMs = duration(intersect([interval], [wait]));
        return overlapMs
          ? [
              {
                category: wait.category,
                name: wait.name,
                runnableId: wait.runnableId,
                stack: wait.stack,
                overlapMs,
              },
            ]
          : [];
      }),
    })),
    captureGaps: union(captureGaps),
    runnables: report.runnables.map((runnable) => ({
      id: runnable.id,
      type: runnable.type,
      title: runnable.title,
      file: runnable.file,
      result: runnable.result,
      ...summarize([runnable], new Set([runnable.id])),
    })),
    files: report.files.map(({ file }) => {
      const runnables = report.runnables.filter((runnable) => runnable.file === file);
      return { file, ...summarize(runnables, new Set(runnables.map(({ id }) => id))) };
    }),
  };
};
