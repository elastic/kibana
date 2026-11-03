/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DetectedBlock, PollContext } from './block_detector';
import { BlockDetector } from './block_detector';
import {
  ONGOING_FAST_REPEAT_MS,
  ONGOING_FAST_REPEAT_UNTIL_MS,
  ONGOING_REPORT_AFTER_MS,
  POLL_INTERVAL_MS,
  REPORT_BURST,
  REPORT_REFILL_MS,
} from './constants';

const running: PollContext = { thresholdMs: 200, phase: 'running' };
const starting: PollContext = { thresholdMs: 200, phase: 'starting' };

/** A block over the threshold and under the ongoing mark. */
const SHORT_BLOCK_MS = 300;
/** Time the main thread runs between two short blocks. */
const GAP_MS = 1_000;

/**
 * Drives a detector along a timeline the way the worker does, so a test reads as what the main
 * thread did. Times are in milliseconds from the start. The heartbeat only moves while the main
 * thread runs; while it is blocked, the worker keeps polling against the last heartbeat.
 */
const createTimeline = () => {
  const detector = new BlockDetector();
  let now = 0;
  let heartbeat = 0;
  const poll = (context: PollContext) => detector.poll(now, heartbeat, context);

  const timeline = {
    now: () => now,
    /** The main thread runs normally for `ms`; its heartbeat is current at the end. */
    runFor: (ms: number) => {
      now += ms;
      heartbeat = now;
    },
    runUntil: (time: number) => timeline.runFor(time - now),
    /** The main thread stays blocked; the worker polls `ms` after its last poll. */
    blockedFor: (ms: number, context = running) => {
      now += ms;
      return poll(context);
    },
    blockedUntil: (time: number, context = running) => timeline.blockedFor(time - now, context),
    /** The main thread stays blocked until `time`; returns what the worker's polls reported. */
    pollBlockedUntil: (time: number) => {
      const reports: DetectedBlock[] = [];
      while (now < time) {
        const block = timeline.blockedFor(POLL_INTERVAL_MS);
        if (block) {
          reports.push(block);
        }
      }
      return reports;
    },
    /** The main thread runs again; the worker's next poll sees the block end. */
    resume: (context = running) => {
      now += POLL_INTERVAL_MS;
      heartbeat = now;
      return poll(context);
    },
    /** A short block after a gap; returns its end report. */
    shortBlock: (context = running) => {
      timeline.runFor(GAP_MS);
      timeline.blockedFor(SHORT_BLOCK_MS, context);
      return timeline.resume(context);
    },
    /** Uses up the burst with reported short blocks; returns when the refill clock started. */
    drainBurst: () => {
      timeline.shortBlock();
      const firstReportAt = now;
      for (let i = 1; i < REPORT_BURST; i++) {
        timeline.shortBlock();
      }
      return firstReportAt;
    },
  };
  return timeline;
};

describe('BlockDetector', () => {
  describe('block end', () => {
    it('reports a block once the heartbeat resumes', () => {
      const t = createTimeline();
      expect(t.blockedFor(150)).toBeUndefined();
      expect(t.blockedFor(100)).toBeUndefined();
      expect(t.blockedFor(650)).toBeUndefined();
      expect(t.resume()).toEqual({
        phase: 'running',
        startedAt: 0,
        endedAt: 900 + POLL_INTERVAL_MS,
        blockedMs: 900 + POLL_INTERVAL_MS,
        report: true,
        suppressedBlocks: 0,
        ongoing: false,
        reportedOngoing: false,
      });
      expect(t.blockedFor(10)).toBeUndefined();
    });

    it('treats a stale heartbeat of exactly the threshold as a block', () => {
      const t = createTimeline();
      expect(t.blockedFor(running.thresholdMs - 1)).toBeUndefined();
      expect(t.resume()).toBeUndefined();
      expect(t.blockedFor(running.thresholdMs)).toBeUndefined();
      expect(t.resume()).toMatchObject({ blockedMs: running.thresholdMs + POLL_INTERVAL_MS });
    });

    it('judges each poll against the threshold passed with it', () => {
      const t = createTimeline();
      expect(t.blockedFor(500, { thresholdMs: 1000, phase: 'running' })).toBeUndefined();
      expect(t.resume()).toBeUndefined();
      expect(t.blockedFor(500, { thresholdMs: 400, phase: 'running' })).toBeUndefined();
      expect(t.resume()).toMatchObject({ blockedMs: 500 + POLL_INTERVAL_MS });
    });

    it('keeps the phase the block started in', () => {
      const t = createTimeline();
      t.blockedFor(300, starting);
      t.blockedFor(300, running);
      expect(t.resume(running)).toMatchObject({ phase: 'starting' });
    });

    it('does not start a block below the threshold of the current phase', () => {
      const t = createTimeline();
      expect(t.blockedFor(300, { thresholdMs: 500, phase: 'starting' })).toBeUndefined();
      expect(t.resume(running)).toBeUndefined();
    });
  });

  describe('ongoing block', () => {
    it('is reported once it has lasted the ongoing mark', () => {
      const t = createTimeline();
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS - POLL_INTERVAL_MS)).toBeUndefined();
      expect(t.blockedFor(POLL_INTERVAL_MS)).toEqual({
        phase: 'running',
        startedAt: 0,
        endedAt: ONGOING_REPORT_AFTER_MS,
        blockedMs: ONGOING_REPORT_AFTER_MS,
        report: true,
        suppressedBlocks: 0,
        ongoing: true,
        reportedOngoing: true,
      });
      expect(t.blockedFor(POLL_INTERVAL_MS)).toBeUndefined();
    });

    it('repeats every few seconds early in the block, then every refill interval', () => {
      const t = createTimeline();
      const reports = t.pollBlockedUntil(3 * REPORT_REFILL_MS);
      // The 1 s mark, 3 s repeats up to 15 s into the block, then one a minute.
      expect(reports.map(({ blockedMs }) => blockedMs)).toEqual([
        1_000, 4_000, 7_000, 10_000, 13_000, 73_000, 133_000,
      ]);
      expect(reports.every(({ ongoing, report }) => ongoing && report)).toBe(true);
      expect(t.resume()).toMatchObject({ blockedMs: 3 * REPORT_REFILL_MS + POLL_INTERVAL_MS });
      expect(t.blockedFor(100)).toBeUndefined();
    });

    it('spaces fast repeats by the fast repeat interval and stops them at the cut-over', () => {
      const t = createTimeline();
      const blockedMs = t.pollBlockedUntil(REPORT_REFILL_MS).map((block) => block.blockedMs);
      const fastRepeats = blockedMs.filter((ms) => ms <= ONGOING_FAST_REPEAT_UNTIL_MS);
      expect(fastRepeats[0]).toBe(ONGOING_REPORT_AFTER_MS);
      fastRepeats.slice(1).forEach((ms, i) => {
        expect(ms - fastRepeats[i]).toBe(ONGOING_FAST_REPEAT_MS);
      });
      expect(blockedMs.length).toBe(fastRepeats.length);
    });

    it('waits for the phase threshold when that is longer than the ongoing mark', () => {
      const t = createTimeline();
      const slow: PollContext = { thresholdMs: 2 * ONGOING_REPORT_AFTER_MS, phase: 'starting' };
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS, slow)).toBeUndefined();
      // Detected and reported on the same poll.
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS, slow)).toMatchObject({
        blockedMs: 2 * ONGOING_REPORT_AFTER_MS,
        ongoing: true,
      });
    });
  });

  describe('rate limit', () => {
    it('reports a burst, then one block per refill, counting the suppressed ones', () => {
      const t = createTimeline();
      const firstReportAt = t.drainBurst();
      expect(t.shortBlock()).toMatchObject({ report: false });
      expect(t.shortBlock()).toMatchObject({ report: false });
      t.runUntil(firstReportAt + REPORT_REFILL_MS);
      expect(t.shortBlock()).toMatchObject({ report: true, suppressedBlocks: 2 });
      t.runUntil(firstReportAt + 2 * REPORT_REFILL_MS);
      expect(t.shortBlock()).toMatchObject({ report: true, suppressedBlocks: 0 });
    });

    it('refills no more than the burst after a long idle stretch', () => {
      const t = createTimeline();
      t.drainBurst();
      t.runFor(10 * REPORT_REFILL_MS);
      for (let i = 0; i < REPORT_BURST; i++) {
        expect(t.shortBlock()).toMatchObject({ report: true });
      }
      expect(t.shortBlock()).toMatchObject({ report: false });
    });

    it('takes no token for ongoing reports, and one for the end of the block', () => {
      const t = createTimeline();
      // More ongoing reports than the burst holds.
      expect(t.pollBlockedUntil(3 * REPORT_REFILL_MS).length).toBeGreaterThan(REPORT_BURST);
      expect(t.resume()).toMatchObject({ report: true, suppressedBlocks: 0, ongoing: false });
      // The long block used one token, for its end; the rest of the burst is still there.
      for (let i = 1; i < REPORT_BURST; i++) {
        expect(t.shortBlock()).toMatchObject({ report: true });
      }
      expect(t.shortBlock()).toMatchObject({ report: false });
    });

    it('reports an ongoing block after short blocks used up the burst', () => {
      const t = createTimeline();
      const firstReportAt = t.drainBurst();
      t.runFor(GAP_MS);
      const blockStartedAt = t.now();
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS)).toMatchObject({
        blockedMs: ONGOING_REPORT_AFTER_MS,
        report: true,
        suppressedBlocks: 0,
        ongoing: true,
      });
      const repeatAt = blockStartedAt + ONGOING_REPORT_AFTER_MS + ONGOING_FAST_REPEAT_MS;
      expect(t.pollBlockedUntil(repeatAt)).toEqual([
        expect.objectContaining({ endedAt: repeatAt, report: true, ongoing: true }),
      ]);
      // The end of the block takes the normal path: no token left, so suppressed. It isn't counted
      // as a block without a warning, since its ongoing warnings were written.
      expect(t.resume()).toMatchObject({ report: false, ongoing: false, reportedOngoing: true });
      t.runUntil(firstReportAt + REPORT_REFILL_MS);
      expect(t.shortBlock()).toMatchObject({ report: true, suppressedBlocks: 0 });
    });
  });
});
