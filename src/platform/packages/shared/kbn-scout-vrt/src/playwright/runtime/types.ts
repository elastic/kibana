/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, Page, TestInfo } from 'playwright/test';

export interface VisualSourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface VisualCheckpointRecord {
  testFile: string;
  testTitle: string;
  testKey: string;
  stepTitle: string;
  stepIndex: number;
  snapshotName: string;
  status: 'captured' | 'updated' | 'passed' | 'failed' | 'missing-baseline';
  imagePath: string;
  diffPath?: string;
  mismatchPercent?: number;
  source: VisualSourceLocation;
}

export interface VisualCheckpointCaptureOptions {
  stepTitle: string;
  stepIndex: number;
  mask: Locator[];
  source: VisualSourceLocation;
}

export interface VisualCheckpointCaptureResult {
  record: VisualCheckpointRecord;
  error?: Error;
}

export interface VisualRegressionContext {
  page: Page;
  testInfo: TestInfo;
  stepCounter: number;
  checkpoints: VisualCheckpointRecord[];
  runId: string;
  packageId: string;
  testKey: string;
}
