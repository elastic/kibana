/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { getKibanaModuleData } from '@kbn/scout-reporting';
import {
  createVisualRegressionManifest,
  type VisualRegressionManifest,
  type VisualRegressionRunManifest,
  upsertVisualRegressionRunManifest,
} from './manifest';
import {
  isCompareBaselinesEnabled,
  SCOUT_VISUAL_REGRESSION_ATTACHMENT_NAME,
  isUpdateBaselinesEnabled,
} from '../runtime/environment';
import {
  getVisualRegressionManifestPath,
  getVisualRegressionRunManifestPath,
} from '../runtime/paths';
import type { VisualCheckpointRecord } from '../runtime/types';

export interface ScoutVisualRegressionReporterOptions {
  runId: string;
}

const readJsonFile = <T>(filePath: string): T | undefined => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
};

const readGitValue = (args: string[]): string => {
  try {
    return execSync(`git ${args.join(' ')}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

const readAttachmentBody = (
  result: TestResult,
  attachmentName: string
): VisualCheckpointRecord[] => {
  const attachment = result.attachments.find((item) => item.name === attachmentName);

  if (!attachment) {
    return [];
  }

  if (attachment.body) {
    return JSON.parse(attachment.body.toString('utf8')) as VisualCheckpointRecord[];
  }

  if (attachment.path) {
    return JSON.parse(fs.readFileSync(attachment.path, 'utf8')) as VisualCheckpointRecord[];
  }

  return [];
};

export class ScoutVisualRegressionReporter implements Reporter {
  private manifest?: VisualRegressionManifest;
  private packageId = 'unknown';
  private startedAt?: string;

  constructor(private readonly options: ScoutVisualRegressionReporterOptions) {}

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig): void {
    const project = config.projects[0];
    this.packageId = config.configFile ? getKibanaModuleData(config.configFile).id : 'unknown';
    this.startedAt = new Date().toISOString();

    this.manifest = createVisualRegressionManifest({
      runId: this.options.runId,
      commitSha: readGitValue(['rev-parse', 'HEAD']),
      branch: readGitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
      target: {
        location: process.env.SCOUT_TARGET_LOCATION || 'unknown',
        arch: process.env.SCOUT_TARGET_ARCH || 'unknown',
        domain: process.env.SCOUT_TARGET_DOMAIN || 'unknown',
      },
      browser: String(project?.use?.browserName ?? 'chromium'),
      viewport:
        project?.use?.viewport && typeof project.use.viewport === 'object'
          ? {
              width: project.use.viewport.width,
              height: project.use.viewport.height,
            }
          : undefined,
      packageId: this.packageId,
    });
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    if (!this.manifest) {
      return;
    }

    this.manifest.results.push(
      ...readAttachmentBody(result, SCOUT_VISUAL_REGRESSION_ATTACHMENT_NAME)
    );
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (!this.manifest || this.manifest.results.length === 0) {
      return;
    }

    const completedAt = new Date().toISOString();
    const manifestPath = getVisualRegressionManifestPath(this.options.runId, this.packageId);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));

    // The run manifest is upserted per-package. Configs run sequentially via
    // scout_vrt run-tests, so concurrent writes to the same runId should not
    // occur. If parallelism is added in the future, this read-modify-write
    // will need a file lock or atomic write mechanism.
    const runManifestPath = getVisualRegressionRunManifestPath(this.options.runId);
    const existingRunManifest = readJsonFile<VisualRegressionRunManifest>(runManifestPath);
    const nextRunManifest = upsertVisualRegressionRunManifest({
      existing: existingRunManifest,
      manifest: this.manifest,
      packageStatus: _result.status,
      mode: isUpdateBaselinesEnabled()
        ? 'update-baselines'
        : isCompareBaselinesEnabled()
        ? 'compare'
        : 'capture',
      startedAt: this.startedAt ?? completedAt,
      completedAt,
    });

    fs.writeFileSync(runManifestPath, JSON.stringify(nextRunManifest, null, 2));
  }
}
