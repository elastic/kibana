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
      startedAt?: string;
      ongoing?: boolean;
      stats?: { starting: PhaseStats; running: PhaseStats; heapUsed: number };
    };
    worker?: { name: string; thread_id: number };
  };
}

interface HarnessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  /** Worker log lines from the child's stdout, parsed as JSON. */
  workerLogLines: WorkerLogLine[];
  /** Raw stdout log lines that weren't JSON. */
  unparsedLogLines: string[];
  /** Main-thread log lines, from the child's fd 3. */
  mainLogLines: Array<{ level: string; message: string }>;
  stderr: string;
}

interface RunHarnessOptions {
  timeoutMs?: number;
  /** Checked after each stdout log line; the child is killed with SIGKILL once it returns true. */
  killWhen?: (workerLogLines: WorkerLogLine[]) => boolean;
}

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
    let pendingStdout = '';
    let stderr = '';
    let mainLog = '';
    let killed = false;
    // Line-buffered: a chunk can end in the middle of a log line.
    const readStdout = (chunk: string, flush = false) => {
      pendingStdout += chunk;
      const lines = pendingStdout.split('\n');
      pendingStdout = flush ? '' : lines.pop() ?? '';
      for (const line of lines.filter(Boolean)) {
        try {
          workerLogLines.push(JSON.parse(line));
        } catch {
          unparsedLogLines.push(line);
        }
      }
      if (killWhen && !killed && killWhen(workerLogLines)) {
        killed = true;
        child.kill('SIGKILL');
      }
    };
    child.stdout?.on('data', (chunk) => readStdout(String(chunk)));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.stdio[3]?.on('data', (chunk) => (mainLog += chunk));
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
      const mainLogLines = mainLog
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      resolve({
        exitCode,
        signal,
        workerLogLines,
        unparsedLogLines,
        mainLogLines,
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
const blockLogLines = ({ workerLogLines }: HarnessResult) =>
  workerLogLines.filter(({ message }) => message.startsWith('Event loop blocked'));
const endedBlockLogLines = (result: HarnessResult) =>
  blockLogLines(result).filter((line) => blockOf(line)?.ongoing === false);

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

  describe('a block that lasts longer than the ongoing mark', () => {
    it('is reported while it lasts, after short blocks used up the warning burst', async () => {
      const ongoingWarnings = (lines: WorkerLogLine[]) =>
        lines.filter((line) => line.log.level === 'WARN' && blockOf(line)?.ongoing === true);
      const result = await runHarness('permanent_block', {
        timeoutMs: 60_000,
        killWhen: (lines) => ongoingWarnings(lines).length >= 2,
      });
      expect(result.signal).toBe('SIGKILL');
      // The short blocks took the whole burst; the warning on the last one was suppressed.
      const ended = endedBlockLogLines(result);
      expect(ended).toHaveLength(REPORT_BURST);
      expect(statsOf(result).some(({ running }) => running.suppressed >= 1)).toBe(true);
      const [first, repeat] = ongoingWarnings(result.workerLogLines);
      expect(first).toMatchObject({
        message: expect.stringMatching(/^Event loop blocked for ~\d+ms so far$/),
        log: { level: 'WARN', logger: 'metrics.event_loop_watchdog' },
        kibana: {
          event_loop_watchdog: {
            phase: 'running',
            ongoing: true,
            startedAt: expect.any(String),
            suppressedBlocks: 0,
          },
          worker: { name: 'event-loop-watchdog', thread_id: expect.any(Number) },
        },
      });
      const firstBlockedMs = blockOf(first)?.blockedMs ?? 0;
      // Early enough to be written before a liveness probe kills a blocked Kibana.
      expect(firstBlockedMs).toBeGreaterThanOrEqual(1_000);
      expect(firstBlockedMs).toBeLessThan(10_000);
      // A repeat of the same block, seconds later rather than on the next poll.
      const { startedAt } = blockOf(first) ?? {};
      expect(blockOf(repeat)).toMatchObject({ ongoing: true, startedAt });
      expect((blockOf(repeat)?.blockedMs ?? 0) - firstBlockedMs).toBeGreaterThanOrEqual(3_000);
      // Still inside the roughly 10 s a liveness probe gives a blocked Kibana.
      expect(blockOf(repeat)?.blockedMs ?? 0).toBeLessThan(10_000);
      // The block never ended, so its log lines came from the worker while the main thread was
      // still blocked.
      expect(ended.map(blockOf)).not.toContainEqual(expect.objectContaining({ startedAt }));
    }, 90_000);

    it('is reported again when it ends, with the same start', async () => {
      const result = await runHarness('long_block');
      expectCleanExit(result);
      const [ongoing, ended, ...rest] = blockLogLines(result).map(blockOf);
      expect(rest).toEqual([]);
      expect(ongoing).toMatchObject({ ongoing: true, phase: 'running' });
      expect(ended).toMatchObject({ ongoing: false, phase: 'running' });
      expect(ongoing?.blockedMs).toBeGreaterThanOrEqual(1000);
      expect(ongoing?.blockedMs).toBeLessThan(3000);
      expect(ended?.blockedMs).toBeGreaterThanOrEqual(3000);
      expect(ended?.startedAt).toBe(ongoing?.startedAt);
      expect(statsOf(result).reduce((total, stats) => total + stats.running.blocks, 0)).toBe(1);
    }, 60_000);
  });
});
