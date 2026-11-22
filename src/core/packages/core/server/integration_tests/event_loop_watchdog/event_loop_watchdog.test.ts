/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import { REPORT_BURST } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/constants';
import type { CpuProfile } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/profile_capture';

const HARNESS = Path.resolve(__dirname, 'fixtures', 'watchdog_harness.ts');

interface PhaseStats {
  thresholdMs: number;
  blocks: number;
  suppressed: number;
}

/** The parts of a worker log line these tests read. */
interface WorkerLogLine {
  /** When the worker's logger wrote the line, by the wall clock. */
  '@timestamp': string;
  message: string;
  log: { level: string; logger: string };
  kibana?: {
    event_loop_watchdog?: {
      phase?: string;
      blockedMs?: number;
      ongoing?: boolean;
      stats?: {
        starting: PhaseStats;
        running: PhaseStats;
        heapUsed: number;
        profiling?: {
          pastStartAfter: number;
          profiled: number;
          captureFailed: number;
          skippedCooldown: number;
          files: { written: number; writeFailed: number };
        };
      };
      profile?: {
        blockedMs: number;
        profiledAfterMs: number;
        profilerStartMs: number;
        sampledMs: number;
        coverage: number;
        captureDurationMs: number;
        samples: number;
        frames: Array<{ name: string; location?: string; percent: number }>;
        kibanaFrames: Array<{
          name: string;
          location?: string;
          percent: number;
          callers: Array<{ name: string; location?: string }>;
        }>;
        topKibanaFrame?: { location?: string; percent: number };
        nodes: number;
        heapUsed: number;
        stopReason: string;
        file: string;
      };
    };
  };
}

interface MainLogLine {
  level: string;
  message: string;
  /** When the main thread wrote the line, by the wall clock; only on some lines. */
  at?: number;
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
  stderr: string;
}

interface RunHarnessOptions {
  timeoutMs?: number;
  /** Optional profile output directory passed to the child as `WATCHDOG_PROFILE_DIR`. */
  profileDir?: string;
  /** Checked after each stdout log line; the child is killed with SIGKILL once it returns true. */
  killWhen?: (workerLogLines: WorkerLogLine[]) => boolean;
}

/**
 * Runs a harness scenario in a child `node` with a piped stdout and without NODE_OPTIONS.
 * `@kbn/setup-node-env` makes the child exit with code 1 on any process warning.
 */
const runHarness = (
  scenario: string,
  { timeoutMs = 90_000, killWhen, profileDir }: RunHarnessOptions = {}
): Promise<HarnessResult> =>
  new Promise((resolve, reject) => {
    // CI sets --max-old-space-size in NODE_OPTIONS, which overrides the worker's heap limit
    // (https://github.com/nodejs/node/issues/67014).
    const { NODE_OPTIONS, ...env } = process.env;
    const child = spawn(
      process.execPath,
      ['-e', `require('@kbn/setup-node-env'); require(${JSON.stringify(HARNESS)});`, scenario],
      {
        cwd: REPO_ROOT,
        env: profileDir ? { ...env, WATCHDOG_PROFILE_DIR: profileDir } : env,
        stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
      }
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
      const mainLogLines: MainLogLine[] = mainLog
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
const profileLogLines = ({ workerLogLines }: HarnessResult) =>
  workerLogLines.filter(({ kibana }) => kibana?.event_loop_watchdog?.profile);
/** The profiler's thread only shows in /proc, so the check runs on Linux. */
const expectProfilerStopped = ({ mainLogLines }: HarnessResult) => {
  if (process.platform === 'linux') {
    expect(mainLogLines.map(({ message }) => message)).toContain('profiler thread stopped');
  }
};
/**
 * Runs a file-writing scenario in a temp directory and returns its result, file path, and parsed
 * profile.
 */
const runWritingHarness = async (scenario: string, options: RunHarnessOptions = {}) => {
  const profileDir = mkdtempSync(Path.join(Os.tmpdir(), 'watchdog-profiles-'));
  try {
    const result = await runHarness(scenario, { ...options, profileDir });
    const files = readdirSync(profileDir);
    expect(files).toHaveLength(1);
    const file = Path.join(profileDir, files[0]);
    return { result, file, profile: JSON.parse(readFileSync(file, 'utf8')) as CpuProfile };
  } finally {
    rmSync(profileDir, { recursive: true, force: true });
  }
};
const isKibanaUrl = (url: string) =>
  url.startsWith('src/') || url.startsWith('x-pack/') || url.startsWith('@kbn/');
/**
 * Checks profile structure and that Kibana frames remain visible with DevTools' default ignore
 * rules.
 */
const expectViewableProfile = ({
  nodes,
  startTime,
  endTime,
  samples = [],
  timeDeltas = [],
}: CpuProfile) => {
  const ids = new Set(nodes.map(({ id }) => id));
  const children = new Set(nodes.flatMap((node) => node.children ?? []));
  expect(samples.length).toBeGreaterThan(0);
  expect(samples.length).toBe(timeDeltas.length);
  expect(samples.filter((id) => !ids.has(id))).toEqual([]);
  expect([...children].filter((id) => !ids.has(id))).toEqual([]);
  expect(nodes.filter(({ id }) => !children.has(id))).toHaveLength(1);
  expect(startTime).toBeLessThanOrEqual(endTime);
  const urls = nodes.map(({ callFrame }) => callFrame.url ?? '');
  const kibanaUrls = urls.filter(isKibanaUrl);
  expect(kibanaUrls.length).toBeGreaterThan(0);
  // Kibana URLs must not keep the `node_modules/` prefix that DevTools ignores by default.
  expect(kibanaUrls.filter((url) => url.includes('node_modules/'))).toEqual([]);
  expect(urls.filter((url) => url.startsWith(`file://${REPO_ROOT}/src/`))).toEqual([]);
  expect(urls.filter((url) => url.startsWith(`file://${REPO_ROOT}/x-pack/`))).toEqual([]);
};
const restarts = ({ mainLogLines }: HarnessResult) =>
  mainLogLines.filter(({ message }) => message.includes('exited unexpectedly'));

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

  it('passes profiling toggles to the running worker without restarting it', async () => {
    const result = await runHarness('profiling_toggle');
    expectCleanExit(result);
    expect(result.workerLogLines.map(({ message }) => message)).toEqual([
      'profiling 1',
      'profiling 0',
      'profiling 1',
    ]);
    const readyLines = result.mainLogLines.filter(({ message }) =>
      message.startsWith('Worker event-loop-watchdog ready ')
    );
    expect(readyLines).toHaveLength(1);
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
    expect(blocking).toMatchObject({ at: expect.any(Number) });
    // Both times are taken where the log lines are written, so they don't depend on when the test
    // reads them: after the main thread blocked, and inside the ~10 s it takes a blocked event loop
    // to fail a liveness probe.
    const sinceBlockingMs = Date.parse(warning['@timestamp']) - (blocking?.at ?? NaN);
    expect(sinceBlockingMs).toBeGreaterThan(0);
    expect(sinceBlockingMs).toBeLessThan(10_000);
  }, 90_000);

  describe('profiling', () => {
    it('profiles a block past the start threshold and logs it when the block ends', async () => {
      const result = await runHarness('profile_blocks');
      expectCleanExit(result);
      const lines = profileLogLines(result);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        message: expect.stringMatching(
          /^Event loop block profile #1: block ~\d+ms \(profiled after/
        ),
        log: { level: 'INFO', logger: 'metrics.event_loop_watchdog' },
        kibana: { event_loop_watchdog: { profile: { stopReason: 'block_ended' } } },
      });
      const profile = lines[0].kibana?.event_loop_watchdog?.profile;
      expect(profile?.profiledAfterMs).toBeGreaterThanOrEqual(1_000);
      expect(profile?.blockedMs).toBeGreaterThanOrEqual(3_900);
      expect(profile?.samples).toBeGreaterThan(50);
      expect(profile?.coverage).toBeGreaterThan(0);
      expect(profile?.coverage).toBeLessThanOrEqual(1);
      expect(profile?.captureDurationMs).toBeGreaterThan(0);
      expect(profile?.topKibanaFrame?.location).toMatch(
        /^src\/core\/packages\/core\/server\/integration_tests\/event_loop_watchdog\/fixtures\/watchdog_harness\.ts:\d+$/
      );
      expect(restarts(result)).toEqual([]);
    }, 120_000);

    it('writes the profile to the profiling directory and logs its file name at WARN', async () => {
      const { result, file, profile } = await runWritingHarness('profile_blocks');
      expectCleanExit(result);
      const lines = profileLogLines(result);
      expect(lines).toHaveLength(1);
      expect(lines[0].log.level).toBe('WARN');
      expect(lines[0].message).toContain(`. Writing ${Path.basename(file)}. Top: `);
      expect(lines[0].message).not.toContain(Path.dirname(file));
      expect(lines[0].kibana?.event_loop_watchdog?.profile?.file).toBe('admitted');
      // The stats count the write only after it completes, so this confirms it finished before
      // shutdown.
      const files = statsOf(result).map(({ profiling }) => profiling?.files);
      expect(files.reduce((sum, counts) => sum + (counts?.written ?? 0), 0)).toBe(1);
      expect(files.reduce((sum, counts) => sum + (counts?.writeFailed ?? 0), 0)).toBe(0);
      expectViewableProfile(profile);
      expect(profile.nodes.map(({ callFrame }) => callFrame.url)).toContain(
        'src/core/packages/core/server/integration_tests/event_loop_watchdog/fixtures/watchdog_harness.ts'
      );
      expect(restarts(result)).toEqual([]);
    }, 120_000);

    it('stops a capture at its maximum duration while the main thread is still blocked', async () => {
      const result = await runHarness('profile_max_duration');
      expectCleanExit(result);
      const [line] = profileLogLines(result);
      expect(line.kibana?.event_loop_watchdog?.profile).toMatchObject({
        stopReason: 'max_duration',
        samples: expect.any(Number),
      });
      // The block went on past the capture, so the capture covers only part of it.
      expect(line.kibana?.event_loop_watchdog?.profile?.coverage).toBeLessThan(1);
      expect(line.message).toMatch(/so far/);
      const ended = result.mainLogLines.find(({ message }) => message === 'block ended');
      // Logged by the worker before the main thread's block ended.
      expect(Date.parse(line['@timestamp'])).toBeLessThan(ended?.at ?? NaN);
    }, 120_000);

    it('writes a large profile without running out of memory at the 64 MB limit', async () => {
      const { result, profile: written } = await runWritingHarness('profile_large', {
        timeoutMs: 120_000,
      });
      expectCleanExit(result);
      // A file cut mid-write fails to parse in `runWritingHarness`.
      expectViewableProfile(written);
      const [line] = profileLogLines(result);
      const profile = line.kibana?.event_loop_watchdog?.profile;
      expect(profile?.stopReason).toBe('max_duration');
      // At least 11.9k nodes; loadDeepCode(2_000, 40) produces ~21k on macOS, ~25k on Linux arm64, ~21k on amd64.
      // Its written file is ~4.4 to 5.1 MB, so this covers the MB dimension as well as node count; the raw
      // profile size isn't on the capture line by design, so node count is what's asserted here.
      expect(profile?.nodes).toBeGreaterThanOrEqual(11_900);
      expect(profile?.frames.length).toBeGreaterThan(0);
      expect(profile?.kibanaFrames.length).toBeGreaterThan(0);
      expect(profile?.heapUsed).toBeGreaterThan(0);
      // No out-of-memory restart at the shipped limit.
      expect(restarts(result)).toEqual([]);
    }, 150_000);

    it('profiles three large blocks in a row in the same worker, and writes one file for the same top frame', async () => {
      const { result, profile: written } = await runWritingHarness('profile_repeated', {
        timeoutMs: 180_000,
      });
      expectCleanExit(result);
      const profiles = profileLogLines(result);
      // A restarted worker numbers its captures from #1 again.
      expect(profiles.map(({ message }) => message)).toEqual([
        expect.stringContaining('profile #1:'),
        expect.stringContaining('profile #2:'),
        expect.stringContaining('profile #3:'),
      ]);
      for (const line of profiles) {
        const profile = line.kibana?.event_loop_watchdog?.profile;
        expect(profile?.nodes).toBeGreaterThanOrEqual(11_900);
        expect(profile?.frames.length).toBeGreaterThan(0);
        expect(profile?.kibanaFrames.length).toBeGreaterThan(0);
      }
      // All three captures share a top frame, so only the first is written.
      expect(profiles.map((line) => line.kibana?.event_loop_watchdog?.profile?.file)).toEqual([
        'admitted',
        'same_frame',
        'same_frame',
      ]);
      const files = statsOf(result).map(({ profiling }) => profiling?.files);
      expect(files.reduce((sum, counts) => sum + (counts?.written ?? 0), 0)).toBe(1);
      expect(files.reduce((sum, counts) => sum + (counts?.sameFrame ?? 0), 0)).toBe(2);
      expect(files.reduce((sum, counts) => sum + (counts?.writeFailed ?? 0), 0)).toBe(0);
      expectViewableProfile(written);
      expect(restarts(result)).toEqual([]);
    }, 210_000);

    it('writes three large profiles in a row in the same worker, one per top frame', async () => {
      const profileDir = mkdtempSync(Path.join(Os.tmpdir(), 'watchdog-profiles-'));
      try {
        const result = await runHarness('profile_repeated_frames', {
          timeoutMs: 180_000,
          profileDir,
        });
        expectCleanExit(result);
        const profiles = profileLogLines(result).map(
          (line) => line.kibana?.event_loop_watchdog?.profile
        );
        expect(profiles.map((profile) => profile?.file)).toEqual([
          'admitted',
          'admitted',
          'admitted',
        ]);
        expect(new Set(profiles.map((profile) => profile?.kibanaFrames[0]?.location)).size).toBe(3);
        for (const profile of profiles) {
          expect(profile?.nodes).toBeGreaterThanOrEqual(11_900);
        }
        const counts = statsOf(result).map(({ profiling }) => profiling?.files);
        expect(counts.reduce((sum, files) => sum + (files?.written ?? 0), 0)).toBe(3);
        expect(counts.reduce((sum, files) => sum + (files?.writeFailed ?? 0), 0)).toBe(0);
        // A file cut mid-write fails to parse.
        const files = readdirSync(profileDir);
        expect(files).toHaveLength(3);
        for (const file of files) {
          expectViewableProfile(
            JSON.parse(readFileSync(Path.join(profileDir, file), 'utf8')) as CpuProfile
          );
        }
        expect(restarts(result)).toEqual([]);
      } finally {
        rmSync(profileDir, { recursive: true, force: true });
      }
    }, 210_000);

    it("ends the main thread's profile when the worker crashes while profiling", async () => {
      const result = await runHarness('profile_crash');
      expectCleanExit(result);
      expect(result.workerLogLines.map(({ message }) => message)).toContain('profiling started');
      expectProfilerStopped(result);
    }, 120_000);

    it("ends the main thread's profile when the watchdog stops while a capture's stop is in flight", async () => {
      const result = await runHarness('profile_shutdown');
      expectCleanExit(result);
      expect(result.mainLogLines.map(({ message }) => message)).toContain(
        'Event loop watchdog stopped'
      );
      expect(restarts(result)).toEqual([]);
      expectProfilerStopped(result);
    }, 120_000);

    it('logs the running capture when profiling is turned off, and profiles no later block', async () => {
      const result = await runHarness('profile_flag_off');
      expectCleanExit(result);
      const lines = profileLogLines(result);
      expect(lines).toHaveLength(1);
      const second = result.mainLogLines.find(({ message }) => message === 'second block');
      expect(Date.parse(lines[0]['@timestamp'])).toBeLessThan(second?.at ?? NaN);
      // Both blocks are past the start threshold, profiled or not.
      const pastStartAfter = statsOf(result).reduce(
        (total, { profiling }) => total + (profiling?.pastStartAfter ?? 0),
        0
      );
      expect(pastStartAfter).toBe(2);
      expect(restarts(result)).toEqual([]);
    }, 120_000);
  });
});
