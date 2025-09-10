/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { execSync } from 'child_process';
import { SCOUT_VISUAL_REGRESSION_OUTPUT_ROOT } from '@kbn/scout-info';
import { REPO_ROOT, kibanaPackageJson } from '@kbn/repo-info';

export interface VisualRegressionReporterOptions {
  outputDir?: string;
  pluginName?: string;
  captureMode?: 'all' | 'passed' | 'failed';
  includeMetadata?: boolean;
  runMode?: string;
}

// Interfaces for test result metadata
export interface VisualRegressionTestResultScreenshot {
  testName: string;
  name: string;
  sequence: number;
  path: string;
  width: number;
  height: number;
  source?: {
    file?: string;
    line?: number;
    column?: number;
    githubUrl?: string;
  };
}

export interface VisualRegressionTestResultEntry {
  status: string;
  duration: number;
  timestamp: string;
  screenshots?: Record<string, VisualRegressionTestResultScreenshot>;
}

/**
 * Scout Visual Regression reporter
 */
export class VisualRegressionReporter implements Reporter {
  private readonly log: ToolingLog;
  private readonly screenshotDir: string;
  private readonly commitHash: string;
  private readonly commitDate: string;
  private readonly pluginName: string;
  private readonly runTypeDir: string;
  private readonly runMode: string;
  private readonly captureMode: 'all' | 'passed' | 'failed';
  private readonly includeMetadata: boolean;
  private readonly testResults: Record<string, VisualRegressionTestResultEntry> = {};

  constructor(private reporterOptions: VisualRegressionReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    // Get commit hash and date internally
    this.commitHash = this.getCommitHash();
    this.commitDate = this.getCommitDate();

    this.pluginName = this.reporterOptions.pluginName || 'unknown';

    const computeRunTypeDir = (mode: string | undefined): string => {
      if (!mode) return 'unknown';
      if (mode === 'stateful') return 'ess';
      const m = mode.match(/^serverless=(?<type>\w+)$/);
      return m?.groups?.type || 'unknown';
    };

    const envMode = this.reporterOptions.runMode || process.env.SCOUT_TARGET_MODE;
    this.runMode = envMode || 'unknown';
    this.runTypeDir = computeRunTypeDir(this.runMode);

    this.screenshotDir = path.join(
      SCOUT_VISUAL_REGRESSION_OUTPUT_ROOT,
      this.commitHash,
      this.runTypeDir,
      this.pluginName
    );

    this.captureMode = this.reporterOptions.captureMode || 'all';
    this.includeMetadata = this.reporterOptions.includeMetadata !== false;

    // Ensure the output directory exists
    fs.mkdirSync(this.screenshotDir, { recursive: true });

    this.log.info(`Visual Regression Reporter initialized for commit: ${this.commitHash}`);
    this.log.info(`Commit date: ${this.commitDate}`);
    this.log.info(`Plugin: ${this.pluginName}`);
    this.log.info(`Screenshots will be saved to: ${this.screenshotDir}`);
  }

  printsToStdio(): boolean {
    return false; // Avoid taking over console output
  }

  onBegin() {
    // Clear the screenshot directory before starting new test run
    this.clearScreenshotDirectory();
  }

  onTestBegin() {
    // This method is called when each test begins
    // We don't need to do anything special here, but implementing it
    // ensures proper lifecycle handling
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const shouldCapture = this.shouldCaptureScreenshot(result.status);

    if (!shouldCapture) {
      return;
    }

    const testName = test.title;

    // Remove special characters and replace spaces with underscores
    const fileName = testName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 100); // Limit length to avoid filesystem issues

    const screens: Record<string, VisualRegressionTestResultScreenshot> = {};

    let sequence = 1;

    if (result.attachments && result.attachments.length > 0) {
      const imageAttachments = result.attachments.filter((a) =>
        a.contentType?.startsWith('image/')
      );

      // Load per-capture metadata sidecars if present
      const getRepoSlug = (): string | undefined => {
        const repo = (kibanaPackageJson as any)?.repository;
        const url: string | undefined = typeof repo === 'string' ? repo : repo?.url;
        if (!url) return undefined;
        // Examples: git+https://github.com/elastic/kibana.git, https://github.com/elastic/kibana.git
        const m = url.match(/github\.com[:/](?<slug>[^/]+\/[^/.]+)(?:\.git)?/);
        return m?.groups?.slug;
      };

      const repoSlug = getRepoSlug() || 'elastic/kibana';

      const metaByName: Record<
        string,
        { file?: string; line?: number; column?: number } | undefined
      > = {};
      const jsonAttachments = result.attachments.filter(
        (a) => a.contentType === 'application/json' && a.name?.startsWith('vrt-metadata:')
      );
      for (const a of jsonAttachments) {
        try {
          const raw = fs.readFileSync(a.path!, 'utf8');
          const data = JSON.parse(raw) as {
            captureName?: string;
            source?: { file?: string; line?: number; column?: number };
          };
          if (data?.captureName) {
            metaByName[data.captureName] = data.source;
          }
        } catch (e) {
          this.log.warning(`Failed to read VRT metadata attachment ${a.path}: ${e}`);
        }
      }

      const sanitizeFileSegment = (segment: string): string => {
        return segment.replace(/[^a-zA-Z0-9_.-]/g, '-');
      };

      const stripVrtPrefix = (segment: string): string => {
        return segment.replace(/^vrt-/, '');
      };

      const parseTimestampPrefix = (p: string): number => {
        const base = path.basename(p);
        const m = /^(\d+)-/.exec(base);
        return m ? parseInt(m[1], 10) : 0;
      };

      // Ensure filename uniqueness by appending -<n> starting at 1 when collisions occur
      const makeUniquePath = (targetDir: string, name: string): string => {
        const ext = path.extname(name) || '.png';
        const baseNoExt = name.slice(0, name.length - ext.length);
        let candidate = path.join(targetDir, name);
        let counter = 1;

        while (fs.existsSync(candidate)) {
          candidate = path.join(targetDir, `${baseNoExt}-${counter}${ext}`);
          counter++;
        }

        return candidate;
      };

      // Normalize then sort: start first, custom names, end last; then by timestamp
      const items = imageAttachments
        .filter((a) => a.path && a.name.trim() !== 'screenshot' && a.name.trim() !== '')
        .map((a) => {
          const p = a.path as string;
          const captureName = a.name.trim();
          const ext = path.extname(path.basename(p)) || '.png';
          const ts = parseTimestampPrefix(p);
          return { p, captureName, ext, ts };
        })
        .sort((a, b) => a.ts - b.ts);

      if (items.length === 0) {
        return;
      }

      // Ensure per-test output directory: plugin/testname/
      const testDirName = sanitizeFileSegment(fileName);
      const testDir = path.join(this.screenshotDir, testDirName);

      try {
        fs.mkdirSync(testDir, { recursive: true });
      } catch (e) {
        this.log.warning(`Failed to create test dir ${testDir}: ${e}`);
      }

      for (const it of items) {
        try {
          const humanName = stripVrtPrefix(it.captureName);
          const filename = `${sequence}-${sanitizeFileSegment(humanName)}${it.ext}`;
          const destPath = makeUniquePath(testDir, filename);
          const screenshotBuffer = fs.readFileSync(it.p);

          fs.writeFileSync(destPath, screenshotBuffer);

          const { width, height } = this.getPngSize(destPath) || { width: 0, height: 0 };
          const meta = metaByName[it.captureName];
          const githubUrl =
            meta?.file && meta?.line
              ? `https://github.com/${repoSlug}/blob/${this.commitHash}/${meta.file}#L${meta.line}`
              : undefined;

          screens[it.captureName] = {
            testName,
            name: humanName,
            sequence,
            path: path.relative(REPO_ROOT, destPath),
            width,
            height,
            source: meta
              ? {
                  file: meta.file,
                  line: meta.line,
                  column: meta.column,
                  githubUrl,
                }
              : undefined,
          };

          sequence++;
        } catch (error) {
          this.log.warning(`Failed to save screenshot for ${fileName}:`, error);
        }
      }

      if (sequence > 1) {
        this.log.info(`Captured ${sequence - 1} screenshot(s) for: ${fileName}`);
      } else {
        this.log.info(`No screenshot attachment found for ${fileName}`);
      }
    }

    const { status, duration } = result;
    const timestamp = Date.now().toString();

    this.testResults[testName] = {
      status,
      duration,
      timestamp,
      screenshots: Object.keys(screens).length > 0 ? screens : undefined,
    };
  }

  async onEnd(result: FullResult) {
    if (this.includeMetadata) {
      await this.saveMetadata(result);
    }

    const entries = Object.entries(this.testResults);
    const totalScreens = entries.reduce(
      (acc, [, r]) => acc + (r.screenshots ? Object.keys(r.screenshots).length : 0),
      0
    );
    this.log.info(`${totalScreens} screenshots captured for ${entries.length} tests`);
  }

  async onExit() {
    // This method is called when the reporter is being shut down
    // We don't need to do anything special here, but implementing it
    // ensures proper lifecycle handling
  }

  private clearScreenshotDirectory(): void {
    try {
      if (fs.existsSync(this.screenshotDir)) {
        fs.rmSync(this.screenshotDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    } catch (error) {
      this.log.warning(`Failed to clear screenshot directory: ${error}`);
    }
  }

  private shouldCaptureScreenshot(status: string): boolean {
    switch (this.captureMode) {
      case 'all':
        return true;
      case 'passed':
        return status === 'passed';
      case 'failed':
        return status === 'failed';
      default:
        return true;
    }
  }

  private getCommitHash(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      this.log.warning('Could not auto-detect git commit hash, using "unknown-commit"');
      return 'unknown-commit';
    }
  }

  private getCommitDate(): string {
    try {
      const timestamp = execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim();
      return timestamp;
    } catch (error) {
      this.log.warning('Could not auto-detect git commit date, using "0"');
      return '0';
    }
  }

  private async saveMetadata(result: FullResult): Promise<void> {
    const { status, duration } = result;
    const { version: nodeVersion, platform, arch } = process;
    const kibanaVersion = kibanaPackageJson.version;
    const timestamp = Date.now().toString();
    const totalTests = Object.keys(this.testResults).length;

    const metadata = {
      commitHash: this.commitHash,
      commitDate: this.commitDate,
      pluginName: this.pluginName,
      testResults: this.testResults,
      captureMode: this.captureMode,
      testRun: {
        timestamp,
        status,
        duration,
        totalTests,
        mode: this.runMode,
        type: this.runTypeDir,
      },
      environment: {
        kibanaVersion,
        nodeVersion,
        platform,
        arch,
      },
    };

    const metadataPath = path.join(this.screenshotDir, 'metadata.json');

    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      this.log.info(`Metadata saved to: ${metadataPath}`);
    } catch (error) {
      this.log.warning(`Failed to save metadata:`, error);
    }
  }

  private getPngSize(filePath: string): { width: number; height: number } | undefined {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(24);
      fs.readSync(fd, buffer, 0, 24, 0);
      fs.closeSync(fd);

      // PNG signature 8 bytes + IHDR chunk length(4) + type(4) => IHDR data starts at byte 16
      const isPng = buffer.toString('ascii', 1, 4) === 'PNG';

      if (!isPng) {
        return undefined;
      }

      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      return { width, height };
    } catch {
      return undefined;
    }
  }
}
