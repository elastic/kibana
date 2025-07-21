/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { spawn, ChildProcess } from 'child_process';

export class VideoRecorder {
  private ffmpegProcess?: ChildProcess;
  private isRecording = false;
  private videoPath?: string;
  private screenshotInterval?: NodeJS.Timeout;
  private screenshotCounter = 0;
  private tempDir?: string;

  constructor(
    private readonly log: ToolingLog,
    private readonly browser: any, // WebDriver browser instance
    private readonly testName: string
  ) {}

  async start(): Promise<void> {
    if (this.isRecording) {
      this.log.warning('Video recording is already in progress');
      return;
    }

    try {
      // Create videos directory if it doesn't exist
      const videosDir = Path.resolve(REPO_ROOT, 'target/functional-tests/videos');
      mkdirSync(videosDir, { recursive: true });

      // Generate video filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9-_]/g, '_');
      this.videoPath = Path.join(videosDir, `${sanitizedTestName}_${timestamp}.mp4`);

      // Create temporary directory for screenshots
      this.tempDir = Path.join(videosDir, `temp_${sanitizedTestName}_${timestamp}`);
      mkdirSync(this.tempDir, { recursive: true });

      this.isRecording = true;
      this.screenshotCounter = 0;

      // Start taking screenshots at regular intervals
      this.screenshotInterval = setInterval(async () => {
        await this.takeScreenshot();
      }, 200); // 5 FPS (1000ms / 5 = 200ms)

      this.log.info(`Video recording started: ${this.videoPath}`);
    } catch (error) {
      this.log.error(`Failed to start video recording: ${error.message}`);
      // Don't throw error to avoid breaking test execution
    }
  }

  async stop(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      // Stop taking screenshots
      if (this.screenshotInterval) {
        clearInterval(this.screenshotInterval);
        this.screenshotInterval = undefined;
      }

      // Take one final screenshot
      await this.takeScreenshot();

      this.isRecording = false;

      this.log.debug(
        `Stopping video recording. Total screenshots captured: ${this.screenshotCounter}`
      );

      // Convert screenshots to video using ffmpeg
      if (this.screenshotCounter > 0) {
        await this.createVideoFromScreenshots();
        this.log.info(`Video recording stopped: ${this.videoPath}`);
      } else {
        this.log.warning('No screenshots were captured during recording');
        // Clean up empty temp directory
        this.cleanupTempFiles();
      }
    } catch (error) {
      this.log.error(`Failed to stop video recording: ${error.message}`);
      // Always try to cleanup temp files even on error
      try {
        this.cleanupTempFiles();
      } catch (cleanupError) {
        this.log.debug(`Cleanup error: ${cleanupError.message}`);
      }
    }
  }

  private async takeScreenshot(): Promise<void> {
    if (!this.isRecording || !this.tempDir) {
      return;
    }

    try {
      // Validate browser service is available and has takeScreenshot method
      if (!this.browser || typeof this.browser.takeScreenshot !== 'function') {
        this.log.debug('Browser service not available or missing takeScreenshot method');
        return;
      }

      // Use WebDriver's screenshot capability
      const screenshot = await this.browser.takeScreenshot();

      if (!screenshot) {
        this.log.debug('Screenshot returned empty result');
        return;
      }

      const screenshotPath = Path.join(
        this.tempDir,
        `screenshot_${this.screenshotCounter.toString().padStart(6, '0')}.png`
      );

      // Convert base64 to buffer and save
      const buffer = Buffer.from(screenshot, 'base64');
      writeFileSync(screenshotPath, buffer);

      this.screenshotCounter++;

      // Log progress every 25 screenshots (5 seconds at 5 FPS)
      if (this.screenshotCounter % 100 === 0) {
        this.log.debug(`Video recording progress: ${this.screenshotCounter} screenshots captured`);
      }
    } catch (error) {
      // Log the first few errors to help with debugging, then go silent
      if (this.screenshotCounter < 5) {
        this.log.debug(`Screenshot error (${this.screenshotCounter + 1}): ${error.message}`);
      }
    }
  }

  private async createVideoFromScreenshots(): Promise<void> {
    if (!this.tempDir || !this.videoPath) {
      return;
    }

    // Check if we have any screenshots before trying to create video
    this.log.debug(
      `Attempting to create video from ${this.screenshotCounter} screenshots in ${this.tempDir}`
    );

    if (this.screenshotCounter === 0) {
      this.log.warning('No screenshots were captured, skipping video creation');
      return;
    }

    // List files in temp directory for debugging
    try {
      const files = readdirSync(this.tempDir);
      this.log.debug(`Files in temp directory: ${files.join(', ')}`);
    } catch (error) {
      this.log.warning(`Could not list temp directory contents: ${error.message}`);
    }

    return new Promise((resolve, reject) => {
      // Use ffmpeg to create video from screenshots
      const inputPattern = Path.join(this.tempDir!, 'screenshot_%06d.png');
      const ffmpegArgs = [
        '-y', // Overwrite output file
        '-framerate',
        '5', // 5 FPS
        '-i',
        inputPattern,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '23',
        '-vf',
        'scale=1300:760',
        this.videoPath!,
      ];
      this.log.debug(`Running ffmpeg with args: ${ffmpegArgs.join(' ')}`);
      this.log.debug(`Input pattern: ${inputPattern}`);
      this.log.debug(`Output path: ${this.videoPath}`);

      this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Capture stderr for better error reporting
      let stderrOutput = '';
      if (this.ffmpegProcess.stderr) {
        this.ffmpegProcess.stderr.on('data', (data) => {
          stderrOutput += data.toString();
        });
      }

      this.ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          this.log.debug(`Video created successfully: ${this.videoPath}`);
          // Clean up temporary screenshots
          this.cleanupTempFiles();
          resolve();
        } else {
          this.log.warning(`ffmpeg process exited with code ${code}`);
          if (stderrOutput) {
            this.log.warning(`ffmpeg stderr: ${stderrOutput}`);
          }
          // Don't reject on ffmpeg failure to avoid breaking test cleanup
          this.log.error(`Failed to create video, but continuing with cleanup`);
          this.cleanupTempFiles();
          resolve();
        }
      });

      this.ffmpegProcess.on('error', (error) => {
        this.log.warning(`ffmpeg spawn error: ${error.message}`);
        // Don't reject on spawn error to avoid breaking test cleanup
        this.cleanupTempFiles();
        resolve();
      });

      // Set a timeout for ffmpeg process
      setTimeout(() => {
        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
          this.ffmpegProcess.kill();
          reject(new Error('ffmpeg process timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  private cleanupTempFiles(): void {
    if (!this.tempDir) {
      return;
    }

    try {
      // Remove temporary directory and all screenshots
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      this.log.debug(`Failed to cleanup temp files: ${error.message}`);
    }
  }

  getVideoPath(): string | undefined {
    return this.videoPath;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

export async function isVideoRecordingAvailable(): Promise<boolean> {
  try {
    // Check if ffmpeg is available
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}
