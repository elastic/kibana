/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Runner } from '../fake_mocha_types';
import type { WaitRecorder } from './wait_recorder';
import type { VisualInterval } from './visual_idle';
import { excludeCaptureGaps, parseFreezeIntervals, summarizeVisualIdle } from './visual_idle';

const execFileAsync = promisify(execFile);

type FfmpegRunner = (
  executable: string,
  args: readonly string[],
  options: { timeout: number }
) => Promise<{ stdout: string; stderr: string }>;

const runFfmpeg: FfmpegRunner = async (executable, args, options) =>
  execFileAsync(executable, args, {
    ...options,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

export interface BrowserVideoOptions {
  frameRate: number;
  noise: number;
  minimumFreezeSeconds: number;
  ffmpegPath: string;
}

interface Frame {
  file: string;
  timeMs: number;
  captureStartMs: number;
  captureEndMs: number;
}

export class BrowserVideoRecorder {
  private captureFrame?: () => Promise<Buffer>;
  private closeCapture?: () => Promise<void> | void;
  private initialFrame?: Buffer;
  private active = false;
  private timer?: NodeJS.Timeout;
  private pendingCapture?: Promise<void>;
  private finalization?: Promise<void>;
  private durationMs?: number;
  private gapStartMs?: number;
  private readonly frames: Frame[] = [];
  private readonly gaps: VisualInterval[] = [];
  private readonly errors: Array<{ timeMs: number; message: string }> = [];
  public readonly unchangedIntervals: VisualInterval[] = [];

  constructor(
    private readonly recorder: WaitRecorder,
    private readonly directory: string,
    private readonly options: BrowserVideoOptions,
    private readonly log: ToolingLog,
    private readonly executeFfmpeg: FfmpegRunner = runFfmpeg
  ) {}

  public setCaptureFrame(capture: () => Promise<Buffer>, close?: () => Promise<void> | void): void {
    this.captureFrame = capture;
    this.closeCapture = close;
  }

  public async prepare(): Promise<void> {
    if (!this.captureFrame) {
      throw new Error('FTR_RECORD_VIDEO requires a browser service providing viewport screenshots');
    }
    try {
      const { stdout } = await this.executeFfmpeg(
        this.options.ffmpegPath,
        ['-hide_banner', '-filters'],
        {
          timeout: 10_000,
        }
      );
      if (!stdout.includes('freezedetect')) throw new Error('FFmpeg has no freezedetect filter');
      const encoders = await this.executeFfmpeg(
        this.options.ffmpegPath,
        ['-hide_banner', '-encoders'],
        {
          timeout: 10_000,
        }
      );
      if (!encoders.stdout.includes('libx264')) throw new Error('FFmpeg has no libx264 encoder');
    } catch (error) {
      throw new Error(
        `FTR video recording requires FFmpeg with freezedetect and libx264: ${error.message}`
      );
    }
    await mkdir(join(this.directory, 'frames'), { recursive: true });
    this.initialFrame = await this.captureWithTimeout();
  }

  public attach(runner: Runner): void {
    runner.on('start', () => {
      if (!this.initialFrame) throw new Error('FTR video recording was not prepared');
      this.active = true;
      this.pendingCapture = this.storeFrame(this.initialFrame, 0, 0)
        .then(() => this.schedule())
        .catch((error) => {
          this.errors.push({ timeMs: 0, message: error.message });
          this.gapStartMs = 0;
          this.active = false;
        });
    });
    runner.on('end', () => this.stop());
  }

  public stop(): void {
    if (this.durationMs !== undefined) return;
    this.durationMs = this.recorder.elapsedMs;
    this.active = false;
    clearTimeout(this.timer);
  }

  public finish(): Promise<void> {
    this.finalization ??= this.finalize();
    return this.finalization;
  }

  private schedule(): void {
    if (!this.active) return;
    this.timer = setTimeout(() => {
      this.pendingCapture = this.captureNext();
    }, 1000 / this.options.frameRate);
  }

  private async captureWithTimeout(): Promise<Buffer> {
    const capture = this.captureFrame;
    if (!capture) throw new Error('No browser screenshot provider');
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        capture(),
        new Promise<Buffer>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Browser screenshot timed out')), 5000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async captureNext(): Promise<void> {
    const startMs = this.recorder.elapsedMs;
    try {
      const frame = await this.captureWithTimeout();
      if (!this.active) return;
      const endMs = this.recorder.elapsedMs;
      const timeMs = (startMs + endMs) / 2;
      const previous = this.frames[this.frames.length - 1];
      if (endMs - startMs > Math.max(1000, 3000 / this.options.frameRate)) {
        this.gaps.push({ startMs: previous?.timeMs ?? startMs, endMs });
      }
      if (previous && timeMs - previous.timeMs > Math.max(1000, 3000 / this.options.frameRate)) {
        this.gapStartMs ??= previous.timeMs;
      }
      if (this.gapStartMs !== undefined) {
        this.gaps.push({ startMs: this.gapStartMs, endMs: timeMs });
        this.gapStartMs = undefined;
      }
      await this.storeFrame(frame, startMs, endMs);
    } catch (error) {
      if (!this.active) return;
      this.errors.push({ timeMs: startMs, message: error.message });
      this.gapStartMs ??= this.frames[this.frames.length - 1]?.timeMs ?? 0;
      if (error.message === 'Browser screenshot timed out') {
        // An unresolved WebDriver command must not accumulate concurrent captures.
        this.active = false;
      }
    }
    this.schedule();
  }

  private async storeFrame(
    buffer: Buffer,
    captureStartMs: number,
    captureEndMs: number
  ): Promise<void> {
    const file = `frames/${String(this.frames.length).padStart(8, '0')}.png`;
    await writeFile(join(this.directory, file), buffer);
    this.frames.push({
      file,
      timeMs: (captureStartMs + captureEndMs) / 2,
      captureStartMs,
      captureEndMs,
    });
  }

  private async finalize(): Promise<void> {
    this.stop();
    await this.closeCapture?.();
    await this.pendingCapture;
    const durationMs = this.durationMs ?? 0;
    if (durationMs <= 0) return;
    if (!this.frames.length) throw new Error('FTR browser video captured no frames');
    const last = this.frames[this.frames.length - 1];
    if (durationMs - last.timeMs > Math.max(1000, 3000 / this.options.frameRate)) {
      this.gapStartMs ??= last.timeMs;
    }
    if (this.gapStartMs !== undefined)
      this.gaps.push({ startMs: this.gapStartMs, endMs: durationMs });
    const manifest = ['ffconcat version 1.0'];
    this.frames.forEach((frame, index) => {
      const endMs = this.frames[index + 1]?.timeMs ?? durationMs;
      manifest.push(
        `file ${frame.file}`,
        'option framerate 1000',
        `duration ${(endMs - frame.timeMs) / 1000}`
      );
    });
    // The concat demuxer needs another frame to honor the final frame's duration.
    manifest.push(`file ${last.file}`, 'option framerate 1000');
    const manifestPath = join(this.directory, 'frames.ffconcat');
    await writeFile(manifestPath, manifest.join('\n') + '\n');
    await writeFile(
      join(this.directory, 'frames.json'),
      JSON.stringify({ durationMs, frames: this.frames, errors: this.errors }, null, 2) + '\n'
    );
    const { frameRate, noise, minimumFreezeSeconds, ffmpegPath } = this.options;
    const filter =
      'scale=1600:1000:force_original_aspect_ratio=decrease:eval=frame,' +
      'pad=1600:1000:(ow-iw)/2:(oh-ih)/2:eval=frame,setsar=1,' +
      `fps=${frameRate},freezedetect=n=${noise}:d=${minimumFreezeSeconds}`;
    const { stderr } = await this.executeFfmpeg(
      ffmpegPath,
      [
        '-hide_banner',
        '-nostdin',
        '-y',
        '-reinit_filter',
        '0',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        manifestPath,
        '-vf',
        filter,
        '-t',
        String(durationMs / 1000),
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        join(this.directory, 'session.mp4'),
      ],
      { timeout: 300_000 }
    );
    await writeFile(join(this.directory, 'ffmpeg.log'), stderr);
    this.unchangedIntervals.push(
      ...excludeCaptureGaps(parseFreezeIntervals(stderr, durationMs), this.gaps).filter(
        ({ startMs, endMs }) => endMs - startMs >= minimumFreezeSeconds * 1000
      )
    );
    const report = summarizeVisualIdle(
      this.recorder.getReport(),
      this.unchangedIntervals,
      this.gaps
    );
    await writeFile(
      join(this.directory, 'visual_idle.json'),
      JSON.stringify(
        {
          ...report,
          coverageStatus: this.gaps.length || this.errors.length ? 'partial' : 'complete',
          video: 'session.mp4',
          analysisInput: 'captured frames before video compression',
          options: this.options,
          capturedFrames: this.frames.length,
          effectiveSampleRate:
            last.timeMs > 0 ? ((this.frames.length - 1) / last.timeMs) * 1000 : 0,
          frameTimestampConvention: 'midpoint between screenshot request and response',
          maximumCaptureDurationMs: this.frames.reduce(
            (maximum, frame) => Math.max(maximum, frame.captureEndMs - frame.captureStartMs),
            0
          ),
        },
        null,
        2
      ) + '\n'
    );
    await rm(join(this.directory, 'frames'), { recursive: true });
    await rm(manifestPath);
    if (report.unobservedMs || this.errors.length) {
      this.log.warning(
        'FTR video capture is partial; unobserved intervals are excluded from visual idle'
      );
    }
    this.log.info(`FTR browser video and visual idle report written to ${this.directory}`);
  }
}
