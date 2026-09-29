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
 * live notices directly to stdout while the main thread is blocked and posts a report to the
 * main thread once the block ends.
 */

import { writeSync } from 'node:fs';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectorEvent } from './block_detector';
import { formatLiveNoticeMessage, formatLogLine } from './format';
import type {
  Activity,
  Candidate,
  MainToWorkerMessage,
  WatchdogWorkerData,
  WorkerToMainMessage,
} from './types';

const hrUs = (): number => Number(process.hrtime.bigint() / 1000n);

interface Block {
  detectedAtUs: number;
  cpuAtDetection: NodeJS.CpuUsage;
  candidates: Candidate[];
  omittedCandidates: number;
}

const runWatchdogWorker = (port: MessagePort, data: WatchdogWorkerData): void => {
  const { options, liveNoticeFormat, loggerName, outputFd } = data;
  const heartbeat = new BigInt64Array(data.heartbeat);
  const activities = new Map<number, Activity>();
  const detector = new BlockDetector(options);
  let block: Block | undefined;

  const post = (message: WorkerToMainMessage) => port.postMessage(message);

  const writeLine = (message: string, meta: Record<string, object>) => {
    if (!liveNoticeFormat) return;
    try {
      writeSync(outputFd, formatLogLine(liveNoticeFormat, loggerName, message, meta));
    } catch {
      // best effort: never let output failures break detection
    }
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

  const onBlockStart = (event: Extract<DetectorEvent, { type: 'block-start' }>) => {
    const blockStartedAt = Date.now() - (event.detectedAt - event.startedAt);
    block = {
      detectedAtUs: event.detectedAt * 1000,
      cpuAtDetection: process.cpuUsage(),
      ...snapshotCandidates(blockStartedAt),
    };
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

  const onBlockEnd = (event: Extract<DetectorEvent, { type: 'block-end' }>) => {
    const current = block;
    block = undefined;
    if (!current || !event.report) return;

    const endedAtUs = hrUs();
    const endedAtMs = Date.now();
    const cpu = process.cpuUsage(current.cpuAtDetection);
    const wallUs = endedAtUs - current.detectedAtUs;
    const toEpochMs = (ms: number) => Math.round(endedAtMs - (endedAtUs / 1000 - ms));

    post({
      type: 'report',
      report: {
        blockedMs: Math.round(event.blockedMs),
        startedAt: toEpochMs(event.startedAt),
        endedAt: toEpochMs(event.endedAt),
        // sampled from detection onwards, which excludes the undetected first `threshold` ms
        cpuRatio: wallUs > 0 ? Math.round(((cpu.user + cpu.system) / wallUs) * 100) / 100 : 0,
        liveNotices: event.liveNotices,
        suppressedBlocks: event.suppressedBlocks,
        candidates: current.candidates,
        omittedCandidates: current.omittedCandidates,
      },
    });
  };

  const handle = (event: DetectorEvent) => {
    switch (event.type) {
      case 'block-start':
        return onBlockStart(event);
      case 'live-notice':
        return onLiveNotice(event);
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

  port.on('close', () => clearInterval(timer));
  post({ type: 'ready' });
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
