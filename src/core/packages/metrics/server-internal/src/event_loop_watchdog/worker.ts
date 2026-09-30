/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in the dedicated watchdog worker thread. Watches the main thread's heartbeat, writes
 * live notices directly to stdout while the main thread is blocked, optionally profiles long
 * blocks through the inspector and writes a report directly once the block ends.
 */

import { createWorkerLogger } from '@kbn/core-threads-server-internal';
import { Session } from 'node:inspector';
import type { LogMeta } from '@kbn/logging';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectorEvent } from './block_detector';
import { formatLiveNoticeMessage, formatReportMessage, type LiveNotice } from './format';
import { WATCHDOG_WORKER_NAME } from './types';
import { summarizeProfile, type CpuProfile } from './profile_summary';
import type {
  Activity,
  BlockReport,
  Candidate,
  MainToWorkerMessage,
  ProfileSummary,
  WatchdogWorkerData,
} from './types';

const hrUs = (): number => Number(process.hrtime.bigint() / 1000n);

/**
 * Maximum reports waiting on inspector responses. Bounds retained block state should the
 * inspector stop responding; further reports are dropped (and counted) instead of queued.
 */
const MAX_PENDING_REPORTS = 10;

interface WatchdogLogMeta extends LogMeta {
  kibana: { event_loop_watchdog: BlockReport | { still_blocked: LiveNotice } };
}

interface Capture {
  /** Detector id of the block that requested this capture. */
  blockId: number;
  requestedAtUs: number;
  startAckUs?: number;
  stopAckUs?: number;
  profile?: CpuProfile;
  error?: string;
  done: Promise<void>;
}

interface Block {
  startedAtUs: number;
  detectedAtUs: number;
  cpuAtDetection: NodeJS.CpuUsage;
  candidates: Candidate[];
  omittedCandidates: number;
  capture?: Capture;
  /** Set when the block qualified for profiling but no capture was started. */
  captureSkippedReason?: string;
}

const runWatchdogWorker = (port: MessagePort, data: WatchdogWorkerData): void => {
  const { options, logging, outputFd, sanitizeRoot } = data;
  const logger = createWorkerLogger(logging, WATCHDOG_WORKER_NAME, outputFd);
  const heartbeat = new BigInt64Array(data.heartbeat);
  const activities = new Map<number, Activity>();
  const detector = new BlockDetector(options);
  const reportedErrors = new Set<string>();

  let session: Session | undefined;
  let profilerReady = false;
  let captureInFlight = false;
  let block: Block | undefined;

  const reportError = (context: string, error: unknown) => {
    // report each distinct failure once to bound log volume
    if (reportedErrors.has(context)) return;
    reportedErrors.add(context);
    logger.warn(`${context}: ${error instanceof Error ? error.message : String(error)}`);
  };

  const inspect = <T>(method: string, params: object = {}): Promise<T> =>
    new Promise((resolve, reject) => {
      if (!session) {
        reject(new Error('inspector session is not connected'));
        return;
      }
      session.post(method, params, (error, result) =>
        error ? reject(error) : resolve(result as T)
      );
    });

  /** Connects the inspector to the main thread so that long blocks can be profiled. */
  const setUpProfiler = () => {
    try {
      session = new Session();
      session.connectToMainThread();
    } catch (error) {
      session = undefined;
      reportError('connectToMainThread failed', error);
      return;
    }
    // `Profiler.enable` is cheap; the expensive part is `Profiler.start` on a long block
    inspect('Profiler.enable')
      .then(() =>
        inspect('Profiler.setSamplingInterval', { interval: options.profileSamplingIntervalUs })
      )
      .then(() => {
        profilerReady = true;
        logger.debug('Event loop watchdog profiler ready');
      })
      .catch((error) => reportError('profiler setup failed', error));
  };

  const snapshotCandidates = (
    blockStartedAt: number
  ): Pick<Block, 'candidates' | 'omittedCandidates'> => {
    const all = [...activities.values()]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map(({ kind, type, id, startedAt }) => ({
        kind,
        type,
        id,
        startedBeforeBlockMs: Math.max(0, Math.round(blockStartedAt - startedAt)),
      }));
    return {
      candidates: all.slice(0, options.maxCandidates),
      omittedCandidates: Math.max(0, all.length - options.maxCandidates),
    };
  };

  const startCapture = (blockId: number): Capture => {
    const capture: Capture = { blockId, requestedAtUs: hrUs(), done: Promise.resolve() };
    capture.done = inspect('Profiler.start')
      .then(() => {
        capture.startAckUs = hrUs();
        detector.onCaptureStarted(capture.startAckUs / 1000, capture.blockId);
      })
      .catch((error) => {
        capture.error = `Profiler.start failed: ${error.message}`;
      });
    return capture;
  };

  const stopCapture = (capture: Capture): Promise<void> => {
    if (capture.stopAckUs !== undefined || capture.error) return capture.done;
    capture.done = capture.done.then(async () => {
      if (capture.error || capture.stopAckUs !== undefined) return;
      try {
        const { profile } = await inspect<{ profile: CpuProfile }>('Profiler.stop');
        capture.profile = profile;
      } catch (error) {
        capture.error = `Profiler.stop failed: ${error.message}`;
      } finally {
        capture.stopAckUs = hrUs();
      }
    });
    return capture.done;
  };

  const summarize = (current: Block, endedAtUs: number): ProfileSummary | undefined => {
    const { capture, captureSkippedReason } = current;
    if (!capture) {
      return captureSkippedReason
        ? { verdict: 'unavailable', reason: captureSkippedReason, frames: [] }
        : undefined;
    }
    if (capture.error || !capture.profile || capture.startAckUs === undefined) {
      return { verdict: 'unavailable', reason: capture.error ?? 'no profile returned', frames: [] };
    }
    return {
      ...summarizeProfile(capture.profile, {
        windowStartUs: current.startedAtUs,
        windowEndUs: Math.min(endedAtUs, capture.stopAckUs ?? endedAtUs),
        startAckUs: capture.startAckUs,
        sanitizeRoot,
        maxFrames: options.maxFrames,
      }),
      startAckLatencyMs: Math.round((capture.startAckUs - capture.requestedAtUs) / 1000),
    };
  };

  const onBlockStart = (event: Extract<DetectorEvent, { type: 'block-start' }>) => {
    const blockStartedAt = Date.now() - (event.detectedAt - event.startedAt);
    block = {
      startedAtUs: event.startedAt * 1000,
      detectedAtUs: event.detectedAt * 1000,
      cpuAtDetection: process.cpuUsage(),
      ...snapshotCandidates(blockStartedAt),
    };
  };

  const onProfileStart = ({ blockId }: Extract<DetectorEvent, { type: 'profile-start' }>) => {
    if (!block) return;
    if (captureInFlight) {
      block.captureSkippedReason = 'a previous capture is still in progress';
    } else if (!profilerReady) {
      block.captureSkippedReason = 'profiler unavailable or not yet enabled';
    } else {
      captureInFlight = true;
      block.capture = startCapture(blockId);
    }
  };

  const onLiveNotice = (event: Extract<DetectorEvent, { type: 'live-notice' }>) => {
    if (!block) return;
    const notice = {
      elapsedMs: Math.round(event.elapsedMs),
      count: event.count,
      maxCount: options.maxLiveNoticesPerBlock,
      candidates: block.candidates,
      omittedCandidates: block.omittedCandidates,
    };
    logger.warn<WatchdogLogMeta>(formatLiveNoticeMessage(notice), {
      kibana: { event_loop_watchdog: { still_blocked: notice } },
    });
  };

  // Only block-end reporting awaits the inspector. The ending block's state is detached
  // synchronously so that a subsequent block cannot be confused with it while reports are queued.
  let reports: Promise<void> = Promise.resolve();
  let pendingReports = 0;
  let droppedReports = 0;
  const onBlockEnd = (event: Extract<DetectorEvent, { type: 'block-end' }>) => {
    const current = block;
    block = undefined;
    if (!current || (!current.capture && !event.report)) return;
    if (pendingReports >= MAX_PENDING_REPORTS) {
      // keep the detector's bundled suppression count; non-reported blocks are already counted
      if (event.report) droppedReports += 1 + event.suppressedBlocks;
      reportError('reports dropped', new Error('inspector responses are pending for too long'));
      return;
    }

    const endedAtUs = hrUs();
    const endedAtMs = Date.now();
    const cpu = process.cpuUsage(current.cpuAtDetection);
    const wallUs = endedAtUs - current.detectedAtUs;
    const cpuRatio = wallUs > 0 ? Math.round(((cpu.user + cpu.system) / wallUs) * 100) / 100 : 0;
    const toEpochMs = (ms: number) => Math.round(endedAtMs - (endedAtUs / 1000 - ms));

    pendingReports++;
    reports = reports
      .then(async () => {
        if (current.capture) {
          await stopCapture(current.capture);
          captureInFlight = false;
        }
        if (!event.report) return;
        const report: BlockReport = {
          blockedMs: Math.round(event.blockedMs),
          startedAt: toEpochMs(event.startedAt),
          endedAt: toEpochMs(event.endedAt),
          // sampled from detection onwards, which excludes the undetected first `threshold` ms
          cpuRatio,
          liveNotices: event.liveNotices,
          suppressedBlocks: event.suppressedBlocks + droppedReports,
          candidates: current.candidates,
          omittedCandidates: current.omittedCandidates,
        };
        droppedReports = 0;
        const profile = summarize(current, event.endedAt * 1000);
        if (profile) report.profile = profile;
        logger.warn<WatchdogLogMeta>(formatReportMessage(report), {
          tags: ['event-loop-watchdog'],
          kibana: { event_loop_watchdog: report },
        });
      })
      .catch((error) => reportError('reporting failed', error))
      .finally(() => {
        pendingReports--;
      });
  };

  // Event handling is synchronous so that live notices are never queued behind inspector calls
  // the blocked main thread cannot service.
  const handle = (event: DetectorEvent) => {
    switch (event.type) {
      case 'block-start':
        return onBlockStart(event);
      case 'live-notice':
        return onLiveNotice(event);
      case 'profile-start':
        return onProfileStart(event);
      case 'profile-deadline':
        if (block?.capture) {
          stopCapture(block.capture).catch((error) => reportError('profile stop failed', error));
        }
        return;
      case 'block-end':
        return onBlockEnd(event);
    }
  };

  port.on('message', (message: MainToWorkerMessage) => {
    switch (message.type) {
      case 'snapshot':
        activities.clear();
        for (const [key, activity] of message.activities) activities.set(key, activity);
        break;
      case 'activity-start':
        activities.set(message.key, message.activity);
        break;
      case 'activity-end':
        activities.delete(message.key);
        break;
    }
  });

  // The detector works in (fractional) milliseconds on the process-wide monotonic clock.
  const timer = setInterval(() => {
    const events = detector.poll(hrUs() / 1000, Number(Atomics.load(heartbeat, 0)) / 1000);
    for (const event of events) handle(event);
  }, options.pollIntervalMs);

  port.on('close', () => {
    clearInterval(timer);
    session?.disconnect();
  });

  setUpProfiler();
  logger.debug('Event loop watchdog worker ready');
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
