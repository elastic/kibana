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
 * live notices directly to stdout while the main thread is blocked, profiles the main thread
 * through the inspector and posts a report once the block ends.
 */

import { writeSync } from 'node:fs';
import { Session } from 'node:inspector';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectorEvent } from './block_detector';
import { formatLiveNoticeMessage, formatLogLine } from './format';
import { summarizeProfile, type CpuProfile } from './profile_summary';
import type {
  Activity,
  BlockReport,
  Candidate,
  MainToWorkerMessage,
  ProfileSummary,
  WatchdogWorkerData,
  WorkerToMainMessage,
} from './types';

const hrUs = (): number => Number(process.hrtime.bigint() / 1000n);

interface Capture {
  startAckUs?: number;
  stopAckUs?: number;
  profile?: CpuProfile;
  error?: string;
  done: Promise<void>;
}

interface Block {
  startedAtUs: number;
  detectedAtUs: number;
  detectedAt: number;
  cpuAtDetection: NodeJS.CpuUsage;
  candidates: Candidate[];
  omittedCandidates: number;
  capture?: Capture;
  captureSkippedReason?: string;
}

const runWatchdogWorker = (port: MessagePort, data: WatchdogWorkerData): void => {
  const { options, liveNoticeFormat, sanitizeRoot, loggerName, outputFd } = data;
  const heartbeat = new BigInt64Array(data.heartbeat);
  const activities = new Map<number, Activity>();
  const detector = new BlockDetector(options);
  const session = new Session();
  const reportedErrors = new Set<string>();

  let profilerReady = false;
  let captureInFlight = false;
  let block: Block | undefined;

  const post = (message: WorkerToMainMessage) => port.postMessage(message);

  const reportError = (context: string, error: unknown) => {
    // report each distinct failure once to bound log volume
    if (reportedErrors.has(context)) return;
    reportedErrors.add(context);
    post({
      type: 'worker-error',
      message: `${context}: ${error instanceof Error ? error.message : String(error)}`,
    });
  };

  const inspect = <T>(method: string, params: object = {}): Promise<T> =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, result) =>
        error ? reject(error) : resolve(result as T)
      )
    );

  const writeLine = (message: string, meta: Record<string, object>) => {
    try {
      writeSync(outputFd, formatLogLine(liveNoticeFormat, loggerName, message, meta));
    } catch {
      // best effort: never let output failures break detection
    }
  };

  const snapshotCandidates = (now: number): Pick<Block, 'candidates' | 'omittedCandidates'> => {
    const all = [...activities.values()]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map(({ kind, type, id, startedAt }) => ({
        kind,
        type,
        id,
        runningForMs: Math.max(0, now - startedAt),
      }));
    return {
      candidates: all.slice(0, options.maxCandidates),
      omittedCandidates: Math.max(0, all.length - options.maxCandidates),
    };
  };

  const startCapture = (): Capture => {
    const capture: Capture = { done: Promise.resolve() };
    capture.done = inspect('Profiler.start')
      .then(() => {
        capture.startAckUs = hrUs();
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

  const summarize = (current: Block, endedAtUs: number): ProfileSummary => {
    const { capture } = current;
    if (!capture) {
      return {
        verdict: 'unavailable',
        reason: current.captureSkippedReason ?? 'no profile captured',
        frames: [],
      };
    }
    if (capture.error || !capture.profile || capture.startAckUs === undefined) {
      return { verdict: 'unavailable', reason: capture.error ?? 'no profile returned', frames: [] };
    }
    return summarizeProfile(capture.profile, {
      windowStartUs: current.startedAtUs,
      windowEndUs: Math.min(endedAtUs, capture.stopAckUs ?? endedAtUs),
      startAckUs: capture.startAckUs,
      sanitizeRoot,
      maxFrames: options.maxFrames,
    });
  };

  const onBlockStart = (event: Extract<DetectorEvent, { type: 'block-start' }>) => {
    const now = Date.now();
    const current: Block = {
      startedAtUs: event.startedAt * 1000,
      detectedAtUs: event.detectedAt * 1000,
      detectedAt: now,
      cpuAtDetection: process.cpuUsage(),
      ...snapshotCandidates(now),
    };
    block = current;

    if (!event.profile) {
      current.captureSkippedReason = 'profile capture rate limit applies';
    } else if (captureInFlight) {
      current.captureSkippedReason = 'a previous capture is still in progress';
    } else if (!profilerReady) {
      current.captureSkippedReason = 'profiler unavailable or not yet enabled';
    } else {
      captureInFlight = true;
      current.capture = startCapture();
    }
  };

  const onBlockEnd = async (event: Extract<DetectorEvent, { type: 'block-end' }>) => {
    const current = block;
    block = undefined;
    if (!current) return;

    const cpu = process.cpuUsage(current.cpuAtDetection);
    const wallUs = hrUs() - current.detectedAtUs;
    const cpuRatio = wallUs > 0 ? Math.round(((cpu.user + cpu.system) / wallUs) * 100) / 100 : 0;

    if (current.capture) {
      await stopCapture(current.capture);
      captureInFlight = false;
    }
    if (!event.report) return;

    const nowMs = Date.now();
    const toEpochMs = (us: number) => Math.round(nowMs - (hrUs() - us) / 1000);
    const report: BlockReport = {
      blockedMs: Math.round(event.blockedMs),
      startedAt: toEpochMs(event.startedAt * 1000),
      endedAt: toEpochMs(event.endedAt * 1000),
      // CPU sampled from detection onwards, which excludes the undetected first `threshold` ms
      cpuRatio,
      liveNotices: event.liveNotices,
      suppressedBlocks: event.suppressedBlocks,
      candidates: current.candidates,
      omittedCandidates: current.omittedCandidates,
      profile: summarize(current, event.endedAt * 1000),
    };
    post({ type: 'report', report });
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
    writeLine(formatLiveNoticeMessage(notice), {
      kibana: { event_loop_watchdog: { still_blocked: notice } },
    });
  };

  // Only block-end handling awaits the inspector; everything else is synchronous so that live
  // notices are never queued behind inspector calls the blocked main thread cannot service.
  let reports: Promise<void> = Promise.resolve();
  const handle = (event: DetectorEvent) => {
    switch (event.type) {
      case 'block-start':
        return onBlockStart(event);
      case 'live-notice':
        return onLiveNotice(event);
      case 'profile-deadline':
        if (block?.capture) {
          stopCapture(block.capture).catch((error) => reportError('profile stop failed', error));
        }
        return;
      case 'block-end':
        reports = reports
          .then(() => onBlockEnd(event))
          .catch((error) => reportError('reporting failed', error));
        return;
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

  try {
    session.connectToMainThread();
    // Enable eagerly while the main thread is (likely) responsive: during a block only
    // `Profiler.start` needs to be serviced by the main isolate.
    inspect('Profiler.enable')
      .then(() =>
        inspect('Profiler.setSamplingInterval', { interval: options.profileSamplingIntervalUs })
      )
      .then(() => {
        profilerReady = true;
      })
      .catch((error) => reportError('profiler setup failed', error))
      .finally(() => post({ type: 'ready', profiler: profilerReady }));
  } catch (error) {
    reportError('connectToMainThread failed', error);
    post({ type: 'ready', profiler: false });
  }

  // The detector works in (fractional) milliseconds on the process-wide monotonic clock.
  const timer = setInterval(() => {
    const events = detector.poll(hrUs() / 1000, Number(Atomics.load(heartbeat, 0)) / 1000);
    for (const event of events) handle(event);
  }, options.pollIntervalMs);

  port.on('close', () => {
    clearInterval(timer);
    session.disconnect();
  });
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
