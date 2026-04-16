/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisualRegressionManifest, VisualRegressionRunManifest } from '@kbn/scout-vrt';
import {
  buildMainBaselineRunPlan,
  createVisualBaselineBundleArchivePath,
  createVisualBaselineBundles,
  createVisualBaselineCatalog,
  parseServerRunFlags,
  type ModuleDiscoveryInfo,
} from './main_baseline_publisher';

const createRunManifest = (): VisualRegressionRunManifest => ({
  schemaVersion: 1,
  runId: 'vrt-main-stateful-classic',
  status: 'passed',
  mode: 'update-baselines',
  startedAt: '2026-03-21T12:00:00.000Z',
  completedAt: '2026-03-21T12:01:00.000Z',
  durationMs: 60000,
  git: {
    commitSha: 'abc123',
    branch: 'main',
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
        width: 1440,
        height: 900,
      },
      {
        width: 1280,
        height: 720,
      },
    ],
  },
  summary: {
    tests: 2,
    checkpoints: 2,
    passed: 0,
    failed: 0,
    captured: 0,
    updated: 2,
    missingBaselines: 0,
    diffs: 0,
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
      startedAt: '2026-03-21T12:00:00.000Z',
      completedAt: '2026-03-21T12:00:30.000Z',
      durationMs: 30000,
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
      status: 'passed',
      browser: 'webkit',
      viewport: {
        width: 1280,
        height: 720,
      },
      manifestPath: 'customBranding/manifest.json',
      artifactsPath: 'customBranding',
      startedAt: '2026-03-21T12:00:30.000Z',
      completedAt: '2026-03-21T12:01:00.000Z',
      durationMs: 30000,
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
  ],
});

const createPackageManifest = (
  packageId: string,
  browser: string,
  viewport: { width: number; height: number },
  imagePath: string
): VisualRegressionManifest => ({
  schemaVersion: 1,
  runId: 'vrt-main-stateful-classic',
  commitSha: 'abc123',
  branch: 'main',
  target: {
    location: 'local',
    arch: 'stateful',
    domain: 'classic',
  },
  browser,
  viewport,
  packageId,
  results: [
    {
      testFile: `${packageId}.spec.ts`,
      testTitle: `${packageId} visual test`,
      testKey: `${packageId}-visual-test`,
      stepTitle: 'step 1',
      stepIndex: 1,
      snapshotName: '01_step_1.png',
      status: 'updated',
      imagePath,
      source: {
        file: `${packageId}.spec.ts`,
        line: 10,
        column: 2,
      },
    },
  ],
});

describe('parseServerRunFlags', () => {
  it('extracts the VRT target from Scout serverRunFlags', () => {
    expect(parseServerRunFlags('--arch serverless --domain search')).toEqual({
      location: 'local',
      arch: 'serverless',
      domain: 'search',
    });
  });
});

describe('buildMainBaselineRunPlan', () => {
  it('groups visual selections by unique Scout serverRunFlags', () => {
    const moduleDiscovery: ModuleDiscoveryInfo[] = [
      {
        configs: [
          {
            path: 'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
            serverRunFlags: ['--arch stateful --domain classic'],
          },
        ],
      },
      {
        configs: [
          {
            path: 'src/platform/plugins/private/navigation/test/scout/ui/playwright.config.ts',
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain search',
            ],
          },
        ],
      },
      {
        configs: [
          {
            path: 'src/platform/plugins/private/navigation/test/scout/ui/playwright.config.ts',
            serverRunFlags: ['--arch stateful --domain classic'],
          },
        ],
      },
    ];

    const plan = buildMainBaselineRunPlan(
      [
        {
          configPath: 'src/platform/plugins/private/navigation/test/scout/ui/playwright.config.ts',
          visualTestFiles: ['b.spec.ts', 'a.spec.ts'],
        },
        {
          configPath:
            'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          visualTestFiles: ['advanced.spec.ts'],
        },
      ],
      moduleDiscovery
    );

    expect(plan).toEqual([
      {
        target: {
          location: 'local',
          arch: 'serverless',
          domain: 'search',
        },
        serverRunFlags: '--arch serverless --domain search',
        runIdSuffix: 'serverless-search',
        selections: [
          {
            configPath:
              'src/platform/plugins/private/navigation/test/scout/ui/playwright.config.ts',
            visualTestFiles: ['a.spec.ts', 'b.spec.ts'],
          },
        ],
      },
      {
        target: {
          location: 'local',
          arch: 'stateful',
          domain: 'classic',
        },
        serverRunFlags: '--arch stateful --domain classic',
        runIdSuffix: 'stateful-classic',
        selections: [
          {
            configPath:
              'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
            visualTestFiles: ['advanced.spec.ts'],
          },
          {
            configPath:
              'src/platform/plugins/private/navigation/test/scout/ui/playwright.config.ts',
            visualTestFiles: ['a.spec.ts', 'b.spec.ts'],
          },
        ],
      },
    ]);
  });
});

describe('createVisualBaselineBundles', () => {
  it('partitions package manifests by target/browser/viewport bundle', () => {
    const bundles = createVisualBaselineBundles(createRunManifest(), [
      createPackageManifest(
        'advancedSettings',
        'chromium',
        { width: 1440, height: 900 },
        'advancedSettings/advancedSettings-visual-test/01_step_1.png'
      ),
      createPackageManifest(
        'customBranding',
        'webkit',
        { width: 1280, height: 720 },
        'customBranding/customBranding-visual-test/01_step_1.png'
      ),
    ]);

    expect(bundles).toEqual([
      {
        relativePath: 'local/stateful/classic/chromium/1440x900',
        browser: 'chromium',
        viewport: {
          width: 1440,
          height: 900,
        },
        runManifest: {
          ...createRunManifest(),
          execution: {
            packageCount: 1,
            browsers: ['chromium'],
            viewports: [
              {
                width: 1440,
                height: 900,
              },
            ],
          },
          summary: {
            tests: 1,
            checkpoints: 1,
            passed: 0,
            failed: 0,
            updated: 1,
            missingBaselines: 0,
            diffs: 0,
          },
          packages: [createRunManifest().packages[0]],
        },
        packageManifests: [
          createPackageManifest(
            'advancedSettings',
            'chromium',
            { width: 1440, height: 900 },
            'advancedSettings/advancedSettings-visual-test/01_step_1.png'
          ),
        ],
        imagePaths: ['advancedSettings/advancedSettings-visual-test/01_step_1.png'],
      },
      {
        relativePath: 'local/stateful/classic/webkit/1280x720',
        browser: 'webkit',
        viewport: {
          width: 1280,
          height: 720,
        },
        runManifest: {
          ...createRunManifest(),
          execution: {
            packageCount: 1,
            browsers: ['webkit'],
            viewports: [
              {
                width: 1280,
                height: 720,
              },
            ],
          },
          summary: {
            tests: 1,
            checkpoints: 1,
            passed: 0,
            failed: 0,
            updated: 1,
            missingBaselines: 0,
            diffs: 0,
          },
          packages: [createRunManifest().packages[1]],
        },
        packageManifests: [
          createPackageManifest(
            'customBranding',
            'webkit',
            { width: 1280, height: 720 },
            'customBranding/customBranding-visual-test/01_step_1.png'
          ),
        ],
        imagePaths: ['customBranding/customBranding-visual-test/01_step_1.png'],
      },
    ]);
  });

  it('builds a consumer-facing main baseline catalog', () => {
    const bundles = createVisualBaselineBundles(createRunManifest(), [
      createPackageManifest(
        'advancedSettings',
        'chromium',
        { width: 1440, height: 900 },
        'advancedSettings/advancedSettings-visual-test/01_step_1.png'
      ),
      createPackageManifest(
        'customBranding',
        'webkit',
        { width: 1280, height: 720 },
        'customBranding/customBranding-visual-test/01_step_1.png'
      ),
    ]);

    expect(createVisualBaselineCatalog('abc123', '2026-03-21T12:02:00.000Z', bundles)).toEqual({
      schemaVersion: 1,
      baselineKind: 'main',
      branch: 'main',
      commitSha: 'abc123',
      runIds: ['vrt-main-stateful-classic'],
      generatedAt: '2026-03-21T12:02:00.000Z',
      bundles: [
        {
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
          relativePath: 'local/stateful/classic/chromium/1440x900',
          manifestPath: 'local/stateful/classic/chromium/1440x900/manifest.json',
          archivePath: 'local/stateful/classic/chromium/1440x900.tar.gz',
          packageCount: 1,
          packageIds: ['advancedSettings'],
        },
        {
          target: {
            location: 'local',
            arch: 'stateful',
            domain: 'classic',
          },
          browser: 'webkit',
          viewport: {
            width: 1280,
            height: 720,
          },
          relativePath: 'local/stateful/classic/webkit/1280x720',
          manifestPath: 'local/stateful/classic/webkit/1280x720/manifest.json',
          archivePath: 'local/stateful/classic/webkit/1280x720.tar.gz',
          packageCount: 1,
          packageIds: ['customBranding'],
        },
      ],
    });
  });

  it('derives a sibling archive path for each baseline bundle', () => {
    expect(createVisualBaselineBundleArchivePath('local/stateful/classic/chromium/1440x900')).toBe(
      'local/stateful/classic/chromium/1440x900.tar.gz'
    );
  });
});
