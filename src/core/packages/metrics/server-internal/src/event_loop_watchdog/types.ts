/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Resolved, millisecond-based watchdog options shared with the worker. */
export interface WatchdogOptions {
  thresholdMs: number;
  heartbeatIntervalMs: number;
  pollIntervalMs: number;
  liveNoticeIntervalMs: number;
  maxLiveNoticesPerBlock: number;
  maxProfileDurationMs: number;
  profileCooldownMs: number;
  maxCandidates: number;
  /** Profiler sampling interval in microseconds. */
  profileSamplingIntervalUs: number;
  /** Maximum number of frames listed in a summary. */
  maxFrames: number;
}

/** Output format of worker-written live notices, matching the process' console appender. */
export type LiveNoticeFormat = 'json' | 'text';

export interface WatchdogWorkerData {
  heartbeat: SharedArrayBuffer;
  options: WatchdogOptions;
  liveNoticeFormat: LiveNoticeFormat;
  /** Absolute path prefix stripped from profile frame URLs. */
  sanitizeRoot: string;
  /** Logger context used in worker-written lines. */
  loggerName: string;
  /** File descriptor live notices are written to (stdout by default). */
  outputFd: number;
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
 * - `unavailable`: no profile (profiling failed, disabled or rate-limited).
 */
export type ProfileVerdict = 'profiled' | 'inconclusive' | 'unavailable';

export interface ProfileSummary {
  verdict: ProfileVerdict;
  /** Human-readable reason for the verdict. */
  reason: string;
  frames: ProfileFrame[];
  /** Share of sampled time attributed to GC. */
  gcPercent?: number;
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
  cpuRatio?: number;
  liveNotices: number;
  /** Earlier blocks whose reports were suppressed by the report rate limit. */
  suppressedBlocks: number;
  candidates: Candidate[];
  omittedCandidates: number;
  profile: ProfileSummary;
}

export type MainToWorkerMessage =
  | { type: 'snapshot'; activities: Array<[number, Activity]> }
  | { type: 'activity-start'; key: number; activity: Activity }
  | { type: 'activity-end'; key: number };

export type WorkerToMainMessage =
  | { type: 'ready'; profiler: boolean }
  | { type: 'report'; report: BlockReport }
  | { type: 'worker-error'; message: string };
