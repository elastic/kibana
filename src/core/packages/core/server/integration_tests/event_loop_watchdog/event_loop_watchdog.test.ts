/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'node:child_process';
import Path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import { REPORT_BURST } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/constants';

const HARNESS = Path.resolve(__dirname, 'fixtures', 'watchdog_harness.ts');

interface PhaseStats {
  thresholdMs: number;
  blocks: number;
  suppressed: number;
}

/** The parts of a worker log line these tests read. */
interface WorkerLogLine {
  message: string;
  log: { level: string; logger: string };
  kibana?: {
    event_loop_watchdog?: {
      phase?: string;
      blockedMs?: number;
      ongoing?: boolean;
      stats?: { starting: PhaseStats; running: PhaseStats; heapUsed: number };
    };
  };
}

interface MainLogLine {
  level: string;
  message: string;
}

interface HarnessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  /** Worker log lines from the child's stdout, parsed as JSON. */
  workerLogLines: WorkerLogLine[];
  /** Raw stdout log lines that weren't JSON. */
  unparsedLogLines: string[];
  /** Main-thread log lines, from the child's fd 3. */
  mainLogLines: MainLogLine[];
  /** When the test read each log line, by its own monotonic clock (ms). */
  receivedAt: Map<WorkerLogLine | MainLogLine, number>;
  stderr: string;
}

interface RunHarnessOptions {
  timeoutMs?: number;
  /** Checked after each stdout log line; the child is killed with SIGKILL once it returns true. */
  killWhen?: (workerLogLines: WorkerLogLine[]) => boolean;
}

/** Calls `onLine` for each line as it comes in: a chunk can end in the middle of a line. */
const lineReader = (onLine: (line: string) => void) => {
  let pending = '';
  return (chunk: string, flush = false) => {
    pending += chunk;
    const lines = pending.split('\n');
    pending = flush ? '' : lines.pop() ?? '';
    lines.filter(Boolean).forEach(onLine);
  };
};

/**
 * Runs a harness scenario in a child `node` with a piped stdout and without NODE_OPTIONS.
 * `@kbn/setup-node-env` makes the child exit with code 1 on any process warning.
 */
const runHarness = (
  scenario: string,
  { timeoutMs = 90_000, killWhen }: RunHarnessOptions = {}
): Promise<HarnessResult> =>
  new Promise((resolve, reject) => {
    // CI sets --max-old-space-size in NODE_OPTIONS, which overrides the worker's heap limit.
    const { NODE_OPTIONS, ...env } = process.env;
    const child = spawn(
      process.execPath,
      ['-e', `require('@kbn/setup-node-env'); require(${JSON.stringify(HARNESS)});`, scenario],
      { cwd: REPO_ROOT, env, stdio: ['ignore', 'pipe', 'pipe', 'pipe'] }
    );
    const workerLogLines: WorkerLogLine[] = [];
    const unparsedLogLines: string[] = [];
    const mainLogLines: MainLogLine[] = [];
    const receivedAt = new Map<WorkerLogLine | MainLogLine, number>();
    let stderr = '';
    let mainLog = '';
    let killed = false;
    const readStdout = lineReader((line) => {
      try {
        const workerLogLine: WorkerLogLine = JSON.parse(line);
        workerLogLines.push(workerLogLine);
        receivedAt.set(workerLogLine, performance.now());
      } catch {
        unparsedLogLines.push(line);
      }
      if (killWhen && !killed && killWhen(workerLogLines)) {
        killed = true;
        child.kill('SIGKILL');
      }
    });
    const readMainLog = lineReader((line) => {
      const mainLogLine: MainLogLine = JSON.parse(line);
      mainLogLines.push(mainLogLine);
      receivedAt.set(mainLogLine, performance.now());
    });
    child.stdout?.on('data', (chunk) => readStdout(String(chunk)));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.stdio[3]?.on('data', (chunk) => {
      mainLog += chunk;
      readMainLog(String(chunk));
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(
        new Error(`Harness "${scenario}" didn't exit within ${timeoutMs}ms:\n${mainLog}\n${stderr}`)
      );
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      child.kill('SIGKILL');
      reject(error);
    });
    // `close`, not `exit`: `exit` can fire before stdout, stderr and fd 3 are drained.
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      readStdout('', true);
      readMainLog('', true);
      resolve({
        exitCode,
        signal,
        workerLogLines,
        unparsedLogLines,
        mainLogLines,
        receivedAt,
        stderr,
      });
    });
  });

/** Shows the child's stderr when it didn't exit cleanly, for example on a process warning. */
const expectCleanExit = ({ exitCode, stderr }: HarnessResult) =>
  expect({ exitCode, stderr: exitCode === 0 ? '' : stderr }).toEqual({ exitCode: 0, stderr: '' });

const warnings = ({ workerLogLines }: HarnessResult) =>
  workerLogLines.filter(({ log }) => log.level === 'WARN');
const statsOf = ({ workerLogLines }: HarnessResult) =>
  workerLogLines.flatMap(({ kibana }) => kibana?.event_loop_watchdog?.stats ?? []);
const statsLogLines = ({ workerLogLines }: HarnessResult) =>
  workerLogLines.filter(({ kibana }) => kibana?.event_loop_watchdog?.stats);
const blockOf = ({ kibana }: WorkerLogLine) => kibana?.event_loop_watchdog;
/** When the test read a log line, by its own clock; NaN for a missing line, which fails any bound. */
const readAt = ({ receivedAt }: HarnessResult, line?: WorkerLogLine | MainLogLine) =>
  (line && receivedAt.get(line)) ?? NaN;

describe('event loop watchdog in a child process', () => {
  let blocks: HarnessResult;

  beforeAll(async () => {
    blocks = await runHarness('blocks');
  }, 120_000);

  it('exits on its own once stopped', () => {
    expect(blocks.mainLogLines.map(({ message }) => message)).toContain('harness done');
    expectCleanExit(blocks);
  });

  it('writes whole JSON log lines to stdout', () => {
    expect(blocks.unparsedLogLines).toEqual([]);
    expect(blocks.workerLogLines.length).toBeGreaterThan(0);
  });

  it('logs a warning on the worker stdout when the main thread is blocked', () => {
    const [first] = warnings(blocks);
    expect(first).toMatchObject({
      message: expect.stringMatching(/^Event loop blocked for ~\d+ms$/),
      log: { level: 'WARN', logger: 'metrics.event_loop_watchdog' },
      tags: ['event-loop-watchdog'],
      service: { node: { roles: ['background_tasks'] }, version: 'harness', type: 'kibana' },
      kibana: {
        event_loop_watchdog: { phase: 'starting', suppressedBlocks: 0 },
        worker: { name: 'event-loop-watchdog', thread_id: expect.any(Number) },
      },
      process: { pid: expect.any(Number) },
    });
    const blockedMs = first.kibana?.event_loop_watchdog?.blockedMs ?? 0;
    expect(blockedMs).toBeGreaterThanOrEqual(450);
    expect(blockedMs).toBeLessThan(1000);
  });

  it('tags blocks after markRunning as running', () => {
    expect(
      warnings(blocks)
        .slice(1)
        .map(({ kibana }) => kibana?.event_loop_watchdog?.phase)
    ).toEqual(['running', 'running', 'running', 'running']);
  });

  it('rate limits warnings and counts every block in the stats log lines', () => {
    expect(warnings(blocks)).toHaveLength(5);

    const sum = (phase: 'starting' | 'running', field: 'blocks' | 'suppressed') =>
      statsOf(blocks).reduce((total, stats) => total + stats[phase][field], 0);
    expect(sum('starting', 'blocks')).toBe(1);
    expect(sum('running', 'blocks')).toBe(7);
    expect(sum('running', 'suppressed')).toBe(3);
  });

  it('writes stats log lines with the worker heap and the thresholds', () => {
    const [stats] = statsLogLines(blocks);
    expect(stats.log.level).toBe('INFO');
    expect(stats.kibana?.event_loop_watchdog?.stats).toMatchObject({
      heapUsed: expect.any(Number),
      droppedLogLines: 0,
      starting: { thresholdMs: 200 },
      running: { thresholdMs: 200 },
    });
  });

  it('keeps restarting a failing worker past three failures in a row', async () => {
    const result = await runHarness('restarts');
    expectCleanExit(result);
    expect(result.mainLogLines).toContainEqual({
      level: 'warn',
      message: expect.stringMatching(
        /^Worker event-loop-watchdog exited unexpectedly .*; restart 4 in 8000ms$/
      ),
    });
    expect(result.mainLogLines).not.toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('exhausted') })
    );
  }, 120_000);

  it("stops a worker that runs out of heap at the watchdog's limit", async () => {
    const result = await runHarness('oom');
    expectCleanExit(result);
    // The effective limit is the watchdog's, not Node's default of several GB.
    const limits = result.mainLogLines.flatMap(({ message }) => {
      const match = /^Worker event-loop-watchdog ready \(thread \d+, heap limit (\d+) MB\)$/.exec(
        message
      );
      return match ? [Number(match[1])] : [];
    });
    expect(limits.length).toBeGreaterThan(0);
    limits.forEach((limitMb) => expect(limitMb).toBeLessThan(512));
    expect(result.mainLogLines).toContainEqual({
      level: 'warn',
      message: expect.stringMatching(/^Worker event-loop-watchdog exited unexpectedly \(oom,/),
    });
  }, 120_000);

  it('detects ongoing event loop blocks once short-block notifications exceed the rate limit', async () => {
    const blockWarnings = (lines: WorkerLogLine[], ongoing: boolean) =>
      lines.filter((line) => blockOf(line)?.ongoing === ongoing);
    // The main thread logs "blocking" right before it blocks for good. The child is killed as soon
    // as the worker reports the block, and the run times out if it never does.
    const result = await runHarness('permanent_block', {
      timeoutMs: 60_000,
      killWhen: (lines) => blockWarnings(lines, true).length > 0,
    });
    // Killed while still blocked: the block never ended, so the warning came while it lasted.
    expect(result.signal).toBe('SIGKILL');
    expect(blockWarnings(result.workerLogLines, false)).toHaveLength(REPORT_BURST);
    const [warning] = blockWarnings(result.workerLogLines, true);
    expect(warning).toMatchObject({
      message: expect.stringMatching(/^Event loop blocked for ~\d+ms so far$/),
      log: { level: 'WARN', logger: 'metrics.event_loop_watchdog' },
      kibana: { event_loop_watchdog: { phase: 'running', ongoing: true } },
    });
    const blocking = result.mainLogLines.find(({ message }) => message === 'blocking');
    expect(blocking).toBeDefined();
    // By the test's own clock: after the main thread blocked, and inside the ~10 s it takes a
    // blocked event loop to fail a liveness probe.
    const sinceBlockingMs = readAt(result, warning) - readAt(result, blocking);
    expect(sinceBlockingMs).toBeGreaterThan(0);
    expect(sinceBlockingMs).toBeLessThan(10_000);
  }, 90_000);
});
