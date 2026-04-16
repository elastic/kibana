/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page, TestInfo } from 'playwright/test';
import { captureVisualCheckpoint } from './checkpoint_capture';
import type { VisualRegressionContext } from './types';

let mockTempRoot = '';

jest.mock('./paths', () => {
  const nodePath = jest.requireActual<typeof import('node:path')>('node:path');

  return {
    getVisualRegressionActualPath: (
      runId: string,
      packageId: string,
      testKey: string,
      snapshotName: string
    ) =>
      nodePath.join(
        mockTempRoot,
        'runs',
        runId,
        'test-artifacts',
        packageId,
        testKey,
        snapshotName
      ),
    getVisualRegressionImagePath: (packageId: string, testKey: string, snapshotName: string) =>
      nodePath.join(packageId, testKey, snapshotName),
    toRepoRelativePath: (filePath: string) =>
      nodePath.relative(nodePath.join(mockTempRoot, 'repo'), filePath),
  };
});

describe('captureVisualCheckpoint', () => {
  const screenshotBuffer = Buffer.from('fake-image-buffer');
  let page: jest.Mocked<Page>;
  let context: VisualRegressionContext;

  beforeEach(() => {
    mockTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-vrt-checkpoint-'));

    page = {
      evaluate: jest.fn(async () => undefined),
      screenshot: jest.fn(async ({ path: screenshotPath }: { path: string }) => {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, screenshotBuffer);
        return screenshotBuffer;
      }),
    } as unknown as jest.Mocked<Page>;

    const testInfo = {
      file: path.join(mockTempRoot, 'repo', 'src', 'plugin', 'test.scout.spec.ts'),
      title: 'renders useful state',
      line: 12,
      column: 3,
      project: { name: 'local' },
    } as unknown as TestInfo;

    context = {
      page,
      testInfo,
      stepCounter: 0,
      checkpoints: [],
      runId: 'run-id',
      packageId: 'advancedSettings',
      testKey: 'renders-useful-state-local',
    };
  });

  it('captures the actual image into the run artifact tree', async () => {
    const result = await captureVisualCheckpoint(context, {
      stepTitle: 'advanced settings page is visible',
      stepIndex: 1,
      mask: [],
      source: {
        file: 'src/plugin/test.scout.spec.ts',
        line: 20,
        column: 4,
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.record.status).toBe('captured');
    expect(result.record.imagePath).toBe(
      path.join(
        'advancedSettings',
        'renders-useful-state-local',
        '01_advanced_settings_page_is_visible.png'
      )
    );
    expect(
      fs.existsSync(
        path.join(
          mockTempRoot,
          'runs',
          'run-id',
          'test-artifacts',
          'advancedSettings',
          'renders-useful-state-local',
          '01_advanced_settings_page_is_visible.png'
        )
      )
    ).toBe(true);
  });
});
