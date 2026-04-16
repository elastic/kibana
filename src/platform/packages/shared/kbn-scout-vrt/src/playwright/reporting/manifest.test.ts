/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createVisualRegressionManifest,
  summarizeVisualRegressionManifest,
  upsertVisualRegressionRunManifest,
  type VisualRegressionManifest,
} from './manifest';

const createPackageManifest = (
  overrides?: Partial<VisualRegressionManifest>
): VisualRegressionManifest => ({
  schemaVersion: 1,
  runId: 'run-id',
  commitSha: 'abc123',
  branch: 'feature/vrt',
  target: {
    location: 'local',
    arch: 'stateful',
    domain: 'classic',
  },
  browser: 'chromium',
  viewport: {
    width: 1440,
    height: 900,
  },
  packageId: 'advancedSettings',
  results: [],
  ...overrides,
});

describe('createVisualRegressionManifest', () => {
  it('creates a manifest shell with the requested metadata', () => {
    const { results: _results, ...seed } = createPackageManifest();

    expect(createVisualRegressionManifest(seed)).toEqual({
      schemaVersion: 1,
      runId: 'run-id',
      commitSha: 'abc123',
      branch: 'feature/vrt',
      target: {
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
      },
      browser: 'chromium',
      viewport: {
        width: 1440,
        height: 900,
      },
      packageId: 'advancedSettings',
      results: [],
    });
  });

  it('summarizes checkpoints by test and outcome', () => {
    const manifest = createPackageManifest({
      results: [
        {
          testFile: 'a.spec.ts',
          testTitle: 'first test',
          testKey: 'first-test-local',
          stepTitle: 'step 1',
          stepIndex: 1,
          snapshotName: '01_step_1.png',
          status: 'passed',
          imagePath: 'pkg/first-test-local/01_step_1.png',
          source: {
            file: 'a.spec.ts',
            line: 10,
            column: 2,
          },
        },
        {
          testFile: 'a.spec.ts',
          testTitle: 'first test',
          testKey: 'first-test-local',
          stepTitle: 'step 2',
          stepIndex: 2,
          snapshotName: '02_step_2.png',
          status: 'failed',
          imagePath: 'pkg/first-test-local/02_step_2.png',
          diffPath: 'pkg/first-test-local/02_step_2-diff.png',
          source: {
            file: 'a.spec.ts',
            line: 20,
            column: 2,
          },
        },
        {
          testFile: 'b.spec.ts',
          testTitle: 'second test',
          testKey: 'second-test-local',
          stepTitle: 'step 1',
          stepIndex: 1,
          snapshotName: '01_step_1.png',
          status: 'updated',
          imagePath: 'pkg/second-test-local/01_step_1.png',
          source: {
            file: 'b.spec.ts',
            line: 30,
            column: 2,
          },
        },
        {
          testFile: 'b.spec.ts',
          testTitle: 'second test',
          testKey: 'second-test-local',
          stepTitle: 'step 2',
          stepIndex: 2,
          snapshotName: '02_step_2.png',
          status: 'updated',
          imagePath: 'pkg/second-test-local/02_step_2.png',
          source: {
            file: 'b.spec.ts',
            line: 35,
            column: 2,
          },
        },
      ],
    });

    expect(summarizeVisualRegressionManifest(manifest)).toEqual({
      tests: 2,
      checkpoints: 4,
      passed: 1,
      failed: 1,
      captured: 0,
      updated: 2,
      missingBaselines: 0,
      diffs: 1,
    });
  });

  it('creates a run-level manifest with package inventory and summary', () => {
    const initialManifest = createPackageManifest({
      results: [
        {
          testFile: 'a.spec.ts',
          testTitle: 'first test',
          testKey: 'first-test-local',
          stepTitle: 'step 1',
          stepIndex: 1,
          snapshotName: '01_step_1.png',
          status: 'updated',
          imagePath: 'advancedSettings/first-test-local/01_step_1.png',
          source: {
            file: 'a.spec.ts',
            line: 10,
            column: 2,
          },
        },
      ],
    });

    const initialRunManifest = upsertVisualRegressionRunManifest({
      manifest: initialManifest,
      packageStatus: 'passed',
      mode: 'update-baselines',
      startedAt: '2026-03-20T18:00:00.000Z',
      completedAt: '2026-03-20T18:00:10.000Z',
    });

    const nextRunManifest = upsertVisualRegressionRunManifest({
      existing: initialRunManifest,
      manifest: createPackageManifest({
        packageId: 'customBranding',
        browser: 'webkit',
        viewport: {
          width: 1280,
          height: 720,
        },
        results: [
          {
            testFile: 'c.spec.ts',
            testTitle: 'branding test',
            testKey: 'branding-test-local',
            stepTitle: 'step 1',
            stepIndex: 1,
            snapshotName: '01_step_1.png',
            status: 'failed',
            imagePath: 'customBranding/branding-test-local/01_step_1.png',
            diffPath: 'customBranding/branding-test-local/01_step_1-diff.png',
            source: {
              file: 'c.spec.ts',
              line: 40,
              column: 2,
            },
          },
        ],
      }),
      packageStatus: 'failed',
      mode: 'compare',
      startedAt: '2026-03-20T18:01:00.000Z',
      completedAt: '2026-03-20T18:01:15.000Z',
    });

    expect(nextRunManifest).toEqual({
      schemaVersion: 1,
      runId: 'run-id',
      status: 'failed',
      mode: 'compare',
      startedAt: '2026-03-20T18:00:00.000Z',
      completedAt: '2026-03-20T18:01:15.000Z',
      durationMs: 75000,
      git: {
        commitSha: 'abc123',
        branch: 'feature/vrt',
      },
      target: {
        location: 'local',
        arch: 'stateful',
        domain: 'classic',
      },
      execution: {
        packageCount: 2,
        browsers: ['chromium', 'webkit'],
        viewports: [
          {
            width: 1280,
            height: 720,
          },
          {
            width: 1440,
            height: 900,
          },
        ],
      },
      summary: {
        tests: 2,
        checkpoints: 2,
        passed: 0,
        failed: 1,
        captured: 0,
        updated: 1,
        missingBaselines: 0,
        diffs: 1,
      },
      packages: [
        {
          packageId: 'advancedSettings',
          status: 'passed',
          browser: 'chromium',
          viewport: {
            width: 1440,
            height: 900,
          },
          manifestPath: 'advancedSettings/manifest.json',
          artifactsPath: 'advancedSettings',
          startedAt: '2026-03-20T18:00:00.000Z',
          completedAt: '2026-03-20T18:00:10.000Z',
          durationMs: 10000,
          summary: {
            tests: 1,
            checkpoints: 1,
            passed: 0,
            failed: 0,
            captured: 0,
            updated: 1,
            missingBaselines: 0,
            diffs: 0,
          },
        },
        {
          packageId: 'customBranding',
          status: 'failed',
          browser: 'webkit',
          viewport: {
            width: 1280,
            height: 720,
          },
          manifestPath: 'customBranding/manifest.json',
          artifactsPath: 'customBranding',
          startedAt: '2026-03-20T18:01:00.000Z',
          completedAt: '2026-03-20T18:01:15.000Z',
          durationMs: 15000,
          summary: {
            tests: 1,
            checkpoints: 1,
            passed: 0,
            failed: 1,
            captured: 0,
            updated: 0,
            missingBaselines: 0,
            diffs: 1,
          },
        },
      ],
    });
  });
});
