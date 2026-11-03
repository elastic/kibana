/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PollContext } from './block_detector';
import { BlockDetector } from './block_detector';
import {
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
    detector,
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

    it('exposes the start of the ongoing block', () => {
      const t = createTimeline();
      t.runFor(500);
      t.blockedFor(100);
      expect(t.detector.ongoingStartedAt).toBeUndefined();
      t.blockedFor(200);
      expect(t.detector.ongoingStartedAt).toBe(500);
      t.resume();
      expect(t.detector.ongoingStartedAt).toBeUndefined();
    });
  });

  describe('ongoing block', () => {
    it('is reported once it has lasted the ongoing mark, then every refill interval', () => {
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
      });
      expect(t.blockedFor(POLL_INTERVAL_MS)).toBeUndefined();
      const repeatAt = ONGOING_REPORT_AFTER_MS + REPORT_REFILL_MS;
      expect(t.blockedUntil(repeatAt - POLL_INTERVAL_MS)).toBeUndefined();
      expect(t.blockedUntil(repeatAt)).toMatchObject({ blockedMs: repeatAt, ongoing: true });
      expect(t.resume()).toMatchObject({ blockedMs: repeatAt + POLL_INTERVAL_MS, ongoing: false });
      expect(t.blockedFor(100)).toBeUndefined();
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

    it('takes one token per block: the end of a block reported while ongoing is free', () => {
      const t = createTimeline();
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS)).toMatchObject({ report: true, ongoing: true });
      expect(t.resume()).toMatchObject({ report: true, suppressedBlocks: 0, ongoing: false });
      // The long block used one token; the rest of the burst is still there.
      for (let i = 1; i < REPORT_BURST; i++) {
        expect(t.shortBlock()).toMatchObject({ report: true });
      }
      expect(t.shortBlock()).toMatchObject({ report: false });
    });

    it('takes a token for each repeated ongoing report', () => {
      const t = createTimeline();
      for (let i = 1; i < REPORT_BURST; i++) {
        t.shortBlock();
      }
      // The last token goes to the ongoing report, and the one refill to its repeat.
      t.runFor(GAP_MS);
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS)).toMatchObject({ report: true, ongoing: true });
      expect(t.blockedFor(REPORT_REFILL_MS)).toMatchObject({ report: true, ongoing: true });
      t.resume();
      expect(t.shortBlock()).toMatchObject({ report: false });
    });

    it('suppresses the ongoing report when the bucket is empty, without counting a suppressed block', () => {
      const t = createTimeline();
      const firstReportAt = t.drainBurst();
      t.runFor(GAP_MS);
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS)).toMatchObject({ report: false, ongoing: true });
      // The end report takes the normal path: suppressed too, and the block counted once.
      expect(t.resume()).toMatchObject({ report: false, ongoing: false });
      t.runUntil(firstReportAt + REPORT_REFILL_MS);
      expect(t.shortBlock()).toMatchObject({ report: true, suppressedBlocks: 1 });
    });

    it('retries a suppressed ongoing report as soon as a token refills', () => {
      const t = createTimeline();
      const firstReportAt = t.drainBurst();
      t.runFor(GAP_MS);
      const blockStartedAt = t.now();
      expect(t.blockedFor(ONGOING_REPORT_AFTER_MS)).toMatchObject({ report: false, ongoing: true });
      const refillAt = firstReportAt + REPORT_REFILL_MS;
      expect(t.blockedUntil(refillAt - POLL_INTERVAL_MS)).toBeUndefined();
      expect(t.blockedUntil(refillAt)).toMatchObject({
        blockedMs: refillAt - blockStartedAt,
        report: true,
        ongoing: true,
      });
      // Reported while ongoing after all, so the end report is free.
      expect(t.resume()).toMatchObject({ report: true, ongoing: false });
    });
  });
});
