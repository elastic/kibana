/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  existsSync,
  unlinkSync,
  rmdirSync,
} from 'fs';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { spawn, ChildProcess } from 'child_process';

type RecordingMethod = 'x11grab' | 'screenshot';

export class VideoRecorder {
  private ffmpegProcess?: ChildProcess;
  private xvfbProcess?: ChildProcess;
  private isRecording = false;
  private videoPath?: string;
  private screenshotInterval?: NodeJS.Timeout;
  private screenshotCounter = 0;
  private tempDir?: string;
  private recordingMethod: RecordingMethod = 'screenshot';
  private displayNumber?: number;
  private originalDisplay?: string;

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
      // Detect the best recording method for this platform
      this.recordingMethod = await this.detectRecordingMethod();
      this.log.debug(`Using recording method: ${this.recordingMethod}`);

      if (this.recordingMethod === 'x11grab') {
        await this.startX11Recording();
      } else {
        await this.startScreenshotRecording();
      }
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
      this.log.warning('No video recording in progress');
      return;
    }

    this.isRecording = false;

    try {
      if (this.recordingMethod === 'x11grab') {
        await this.stopX11Recording();
      } else {
        await this.stopScreenshotRecording();
      }
    } catch (error) {
      this.log.error(`Failed to stop video recording: ${error}`);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Stop X11-based recording
   */
  private async stopX11Recording(): Promise<void> {
    // Stop ffmpeg recording
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');

      // Wait for ffmpeg to finish processing
      await new Promise<void>((resolve) => {
        if (!this.ffmpegProcess) {
          resolve();
          return;
        }

        this.ffmpegProcess.on('close', () => resolve());

        // Force kill after 5 seconds if it doesn't respond
        setTimeout(() => {
          if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
            this.ffmpegProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }

    // Stop Xvfb process on Linux
    if (this.xvfbProcess && process.platform === 'linux') {
      this.xvfbProcess.kill('SIGTERM');

      // Wait for Xvfb to stop
      await new Promise<void>((resolve) => {
        if (!this.xvfbProcess) {
          resolve();
          return;
        }

        this.xvfbProcess.on('close', () => resolve());

        // Force kill after 3 seconds
        setTimeout(() => {
          if (this.xvfbProcess && !this.xvfbProcess.killed) {
            this.xvfbProcess.kill('SIGKILL');
          }
          resolve();
        }, 3000);
      });
    }

    // Restore original DISPLAY environment variable
    if (this.originalDisplay !== undefined) {
      process.env.DISPLAY = this.originalDisplay;
    } else {
      delete process.env.DISPLAY;
    }

    this.log.info(`X11 video recording saved: ${this.videoPath}`);
  }

  /**
   * Stop screenshot-based recording
   */
  private async stopScreenshotRecording(): Promise<void> {
    // Stop taking screenshots
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = undefined;
    }

    // Wait a moment for any pending screenshots
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!this.tempDir || !this.videoPath) {
      this.log.error('Missing temporary directory or video path');
      return;
    }

    // Check if we have any screenshots
    const screenshots = readdirSync(this.tempDir).filter((file) => file.endsWith('.png'));
    if (screenshots.length === 0) {
      this.log.warning('No screenshots captured, skipping video creation');
      return;
    }

    this.log.info(`Creating video from ${screenshots.length} screenshots...`);

    // Create video using ffmpeg
    const ffmpegArgs = [
      '-framerate',
      '5',
      '-i',
      Path.join(this.tempDir, 'screenshot_%06d.png'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-vf',
      'scale=1300:760', // Scale to consistent size
      '-y', // Overwrite output file if it exists
      this.videoPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      ffmpeg.stderr.on('data', (data) => {
        // ffmpeg outputs progress info to stderr, which is normal
        const output = data.toString();
        if (output.includes('Error') || output.includes('error')) {
          this.log.debug(`ffmpeg stderr: ${output}`);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.log.info(`Screenshot video recording saved: ${this.videoPath}`);
          resolve();
        } else {
          this.log.error(`ffmpeg process exited with code ${code}`);
          reject(new Error(`ffmpeg failed with exit code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        this.log.error(`ffmpeg error: ${error.message}`);
        reject(error);
      });
    });
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

  /**
   * Detect the best recording method for the current platform
   */
  private async detectRecordingMethod(): Promise<RecordingMethod> {
    const platform = process.platform;

    if (platform === 'linux' && (await this.isXvfbAvailable())) {
      return 'x11grab'; // Linux: Use Xvfb
    }

    if (platform === 'darwin' && (await this.isXQuartzAvailable())) {
      return 'x11grab'; // macOS: Use XQuartz
    }

    return 'screenshot'; // Windows fallback or when X11 not available
  }

  /**
   * Check if Xvfb is available on Linux
   */
  private async isXvfbAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const xvfb = spawn('which', ['Xvfb'], { stdio: 'ignore' });
      xvfb.on('close', (code) => resolve(code === 0));
      xvfb.on('error', () => resolve(false));
    });
  }

  /**
   * Check if XQuartz is available on macOS
   */
  private async isXQuartzAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if X11 is available (XQuartz provides this)
      const x11 = spawn('which', ['X'], { stdio: 'ignore' });
      x11.on('close', (code) => resolve(code === 0));
      x11.on('error', () => resolve(false));
    });
  }

  /**
   * Start high-performance X11 recording using Xvfb (Linux) or XQuartz (macOS)
   */
  private async startX11Recording(): Promise<void> {
    // Create videos directory
    const videosDir = Path.resolve(REPO_ROOT, 'target/functional-tests/videos');
    mkdirSync(videosDir, { recursive: true });

    // Generate video filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9-_]/g, '_');
    this.videoPath = Path.join(videosDir, `${sanitizedTestName}_${timestamp}.mp4`);

    // Find available display number
    this.displayNumber = await this.getAvailableDisplay();
    this.originalDisplay = process.env.DISPLAY;

    if (process.platform === 'linux') {
      // Start Xvfb virtual display on Linux
      this.xvfbProcess = spawn('Xvfb', [
        `:${this.displayNumber}`,
        '-screen',
        '0',
        '1300x760x24',
        '-ac', // Disable access control
        '+extension',
        'RANDR', // Enable RANDR extension
      ]);

      // Wait for Xvfb to start
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Set DISPLAY environment variable for the browser
    process.env.DISPLAY = `:${this.displayNumber}.0`;

    // Start ffmpeg recording
    this.ffmpegProcess = spawn('ffmpeg', [
      '-f',
      'x11grab',
      '-r',
      '30', // 30 FPS
      '-s',
      '1300x760',
      '-i',
      `:${this.displayNumber}.0`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-y', // Overwrite output file
      this.videoPath,
    ]);

    this.isRecording = true;
    this.log.info(`X11 video recording started: ${this.videoPath} (30 FPS)`);
  }

  /**
   * Start screenshot-based recording (fallback method)
   */
  private async startScreenshotRecording(): Promise<void> {
    // Create videos directory
    const videosDir = Path.resolve(REPO_ROOT, 'target/functional-tests/videos');
    mkdirSync(videosDir, { recursive: true });

    // Generate video filename
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

    this.log.info(`Screenshot video recording started: ${this.videoPath} (5 FPS)`);
  }

  /**
   * Find an available X11 display number
   */
  private async getAvailableDisplay(): Promise<number> {
    // Start from display 99 and work backwards to avoid conflicts
    for (let display = 99; display >= 10; display--) {
      const lockFile = `/tmp/.X${display}-lock`;
      try {
        // Check if display is already in use
        if (!existsSync(lockFile)) {
          return display;
        }
      } catch {
        return display;
      }
    }
    return 99; // Default fallback
  }

  /**
   * Clean up temporary files and reset state
   */
  private cleanup(): void {
    // Clear intervals
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = undefined;
    }

    // Clean up temporary directory for screenshot method
    if (this.tempDir) {
      try {
        if (existsSync(this.tempDir)) {
          const files = readdirSync(this.tempDir);
          for (const file of files) {
            const filePath = Path.join(this.tempDir, file);
            unlinkSync(filePath);
          }
          rmdirSync(this.tempDir);
        }
      } catch (error) {
        this.log.debug(`Failed to cleanup temp directory: ${error}`);
      }
      this.tempDir = undefined;
    }

    // Reset state
    this.ffmpegProcess = undefined;
    this.xvfbProcess = undefined;
    this.screenshotCounter = 0;
    this.videoPath = undefined;
    this.displayNumber = undefined;
    this.originalDisplay = undefined;
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
