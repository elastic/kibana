/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { writeFile, rm } from 'fs/promises';
import { ToolingLog } from '@kbn/tooling-log';
import { BrowserVideoRecorder } from './browser_video_recorder';
import { WaitRecorder } from './wait_recorder';
import type { VisualIdleReport } from './visual_idle';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

const setup = async () => {
  const runner = Object.assign(new EventEmitter(), {
    abort: jest.fn(),
    uncaught: jest.fn(),
    failures: 0,
  });
  const waits = new WaitRecorder('/config.ts', () => Date.now());
  const capture = jest.fn(async (): Promise<Buffer> => Buffer.from('viewport PNG'));
  const execute = jest.fn(
    async (_file: string, _args: readonly string[], _options: { timeout: number }) => ({
      stdout: 'freezedetect libx264',
      stderr: 'lavfi.freezedetect.freeze_start: 0',
    })
  );
  const video = new BrowserVideoRecorder(
    waits,
    '/recording',
    { frameRate: 5, noise: 0.001, minimumFreezeSeconds: 1, ffmpegPath: 'ffmpeg' },
    new ToolingLog(),
    execute
  );
  video.setCaptureFrame(capture);
  await video.prepare();
  waits.attach(runner);
  video.attach(runner);
  runner.emit('start');
  await jest.advanceTimersByTimeAsync(0);
  return { runner, waits, capture, execute, video };
};

const readReport = (): VisualIdleReport & { coverageStatus: string; capturedFrames: number } => {
  const call = jest
    .mocked(writeFile)
    .mock.calls.find(([path]) => String(path).endsWith('visual_idle.json'));
  if (!call) throw new Error('No visual report written');
  return JSON.parse(String(call[1]));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(0);
});
afterEach(() => {
  jest.useRealTimers();
});

it('records real elapsed time, closes an EOF freeze, and finalizes once', async () => {
  const { runner, capture, execute, video } = await setup();
  await jest.advanceTimersByTimeAsync(2500);
  runner.emit('end');
  await Promise.all([video.finish(), video.finish()]);
  expect(readReport()).toMatchObject({
    durationMs: 2500,
    unchangedScreenMs: 2500,
    unchangedPercent: 100,
    coverageStatus: 'complete',
    capturedFrames: 13,
  });
  expect(capture).toHaveBeenCalledTimes(13);
  expect(execute).toHaveBeenCalledTimes(3);
  const args = execute.mock.calls[2][1];
  expect(args).toContain('/recording/session.mp4');
  expect(args).toContain('2.5');
  expect(args.find((arg) => arg.includes('freezedetect=n='))).toContain(
    'fps=5,freezedetect=n=0.001:d=1'
  );
  expect(jest.mocked(rm).mock.calls.map(([path]) => String(path))).toContain('/recording/frames');
});

it('recovers from screenshot errors and excludes their gaps', async () => {
  const { runner, capture, video } = await setup();
  capture.mockRejectedValueOnce(new Error('No such window'));
  await jest.advanceTimersByTimeAsync(3000);
  runner.emit('end');
  await video.finish();
  expect(readReport()).toMatchObject({
    coverageStatus: 'partial',
    unobservedMs: 400,
    unchangedScreenMs: 2600,
  });
  expect(readReport().captureGaps).toEqual([{ startMs: 0, endMs: 400 }]);
});

it('does not label a stalled capture as a frozen screen or enqueue more captures', async () => {
  const { runner, capture, video } = await setup();
  capture.mockImplementation(() => new Promise<Buffer>(() => {}));
  await jest.advanceTimersByTimeAsync(6000);
  runner.emit('end');
  await video.finish();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(readReport()).toMatchObject({
    coverageStatus: 'partial',
    unobservedMs: 6000,
    unchangedScreenMs: 0,
  });
  expect(readReport().intervals).toEqual([]);
});

it('marks a long scheduling gap unobserved', async () => {
  const { runner, video } = await setup();
  jest.setSystemTime(2000);
  await jest.advanceTimersByTimeAsync(2200);
  runner.emit('end');
  await video.finish();
  expect(readReport()).toMatchObject({
    coverageStatus: 'partial',
    unobservedMs: 2200,
    unchangedScreenMs: 2000,
  });
});

it('requires a browser capture provider before starting FFmpeg', async () => {
  const execute = jest.fn();
  const video = new BrowserVideoRecorder(
    new WaitRecorder('/config.ts'),
    '/recording',
    { frameRate: 5, noise: 0.001, minimumFreezeSeconds: 1, ffmpegPath: 'ffmpeg' },
    new ToolingLog(),
    execute
  );
  await expect(video.prepare()).rejects.toThrow('requires a browser service');
  expect(execute).not.toHaveBeenCalled();
});

it('reports missing FFmpeg prerequisites before running tests', async () => {
  const execute = jest.fn(async () => {
    throw new Error('ENOENT');
  });
  const capture = jest.fn();
  const video = new BrowserVideoRecorder(
    new WaitRecorder('/config.ts'),
    '/recording',
    { frameRate: 5, noise: 0.001, minimumFreezeSeconds: 1, ffmpegPath: '/missing/ffmpeg' },
    new ToolingLog(),
    execute
  );
  video.setCaptureFrame(capture);
  await expect(video.prepare()).rejects.toThrow('requires FFmpeg with freezedetect and libx264');
  expect(capture).not.toHaveBeenCalled();
});
