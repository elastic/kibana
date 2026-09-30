/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkerLoggingConfig } from '@kbn/core-threads-server-internal';

export const WATCHDOG_WORKER_NAME = 'kibana-event-loop-watchdog';

/** Resolved, millisecond-based watchdog options shared with the worker. */
export interface WatchdogOptions {
  thresholdMs: number;
  heartbeatIntervalMs: number;
  pollIntervalMs: number;
  liveNoticeIntervalMs: number;
  maxLiveNoticesPerBlock: number;
  maxCandidates: number;
  /** Blocks are only profiled once they have lasted this long. */
  profileAfterMs: number;
  maxProfileDurationMs: number;
  /** Minimum interval between two profiler starts (acknowledgements). */
  profileCooldownMs: number;
  /** Profiler sampling interval in microseconds. */
  profileSamplingIntervalUs: number;
  /** Maximum number of frames listed in a profile summary. */
  maxFrames: number;
}

export interface WatchdogWorkerData {
  heartbeat: SharedArrayBuffer;
  options: WatchdogOptions;
  logging: WorkerLoggingConfig;
  /** File descriptor diagnostics are written to (stdout by default). */
  outputFd: number;
  /** Absolute path prefix stripped from profile frame URLs. */
  sanitizeRoot: string;
}

/**
 * An allowlisted description of in-flight work that may explain a block. Contains no task
 * params, credentials, user-provided names, URLs or bodies.
 */
export interface Activity {
  kind: 'task';
  /** e.g. the task type */
  type: string;
  /** Opaque identifier, e.g. the task id */
  id: string;
  startedAt: number;
}

export interface Candidate {
  kind: Activity['kind'];
  type: string;
  id: string;
  /** How long before the (estimated) block start the activity started. */
  startedBeforeBlockMs: number;
}

export interface ProfileFrame {
  functionName: string;
  /** Sanitised location: repo-relative path, or basename for paths outside the repo root. */
  location: string;
  selfTimeMs: number;
  selfPercent: number;
  /** Nearest callers (sanitised `functionName (location)`), innermost first. */
  callers: string[];
}

/**
 * - `profiled`: the profile covers the block with JS samples.
 * - `inconclusive`: a profile was captured but does not reliably cover the block
 *   (e.g. profiler started only after the block ended, as with native or syscall blocks).
 * - `unavailable`: no profile (profiling failed or was rate-limited).
 */
export type ProfileVerdict = 'profiled' | 'inconclusive' | 'unavailable';

export interface ProfileSummary {
  verdict: ProfileVerdict;
  /** Human-readable reason for the verdict. */
  reason: string;
  frames: ProfileFrame[];
  /** Share of sampled time attributed to GC. */
  gcPercent?: number;
  /**
   * Time between requesting `Profiler.start` and its acknowledgement. It includes waiting for the
   * main thread to service the request (the rest of a native/syscall block) and the profiler's own
   * start-up stall, which grows with the amount of compiled code. Only for `profiled` verdicts is
   * it a reasonable upper bound of the time the watchdog itself added to the block.
   */
  startAckLatencyMs?: number;
}

export interface BlockReport {
  blockedMs: number;
  /** Estimated start of the block (last heartbeat), epoch ms. */
  startedAt: number;
  endedAt: number;
  /**
   * Process CPU time consumed during the block divided by its wall time. Near 0 suggests a
   * syscall/IO wait; near or above 1 suggests CPU-bound work. Includes other threads.
   */
  cpuRatio: number;
  liveNotices: number;
  /** Earlier blocks whose reports were suppressed by the report rate limit. */
  suppressedBlocks: number;
  candidates: Candidate[];
  omittedCandidates: number;
  /** Present only for blocks that lasted at least `profileAfter`. */
  profile?: ProfileSummary;
}

export type MainToWorkerMessage =
  | { type: 'snapshot'; activities: Array<[number, Activity]> }
  | { type: 'activity-start'; key: number; activity: Activity }
  | { type: 'activity-end'; key: number };
