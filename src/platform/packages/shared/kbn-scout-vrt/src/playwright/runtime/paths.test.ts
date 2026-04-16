/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  getVisualRegressionActualPath,
  getVisualRegressionBaselinePath,
  getVisualRegressionBaselinesRoot,
  getVisualRegressionDiffPath,
  getVisualRegressionDiffImagePath,
  getVisualRegressionImagePath,
  getVisualRegressionManifestPath,
  getVisualRegressionPackageArtifactsDir,
  getVisualRegressionPlaywrightArtifactsDir,
  getVisualRegressionRunManifestPath,
  getVisualRegressionTestArtifactsDir,
  toRunRelativePath,
} from './paths';

describe('visual regression paths', () => {
  it('writes baselines outside the repo test roots', () => {
    expect(getVisualRegressionBaselinesRoot()).toBe(
      path.join(REPO_ROOT, '.scout', 'baselines', 'vrt')
    );
    expect(
      getVisualRegressionBaselinePath(
        'advancedSettings',
        'advanced_settings_test-local',
        '01_all_privileges.png'
      )
    ).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'baselines',
        'vrt',
        'advancedSettings',
        'advanced_settings_test-local',
        '01_all_privileges.png'
      )
    );
    expect(
      getVisualRegressionImagePath(
        'advancedSettings',
        'advanced_settings_test-local',
        '01_all_privileges.png'
      )
    ).toBe(path.join('advancedSettings', 'advanced_settings_test-local', '01_all_privileges.png'));
    expect(
      getVisualRegressionDiffImagePath(
        'advancedSettings',
        'advanced_settings_test-local',
        '01_all_privileges.png'
      )
    ).toBe(
      path.join('advancedSettings', 'advanced_settings_test-local', '01_all_privileges-diff.png')
    );
  });

  it('groups baselines and Driftik-facing artifacts under the same package and test key', () => {
    expect(getVisualRegressionPackageArtifactsDir('run-id', 'advancedSettings')).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'test-artifacts',
        'vrt',
        'run-id',
        'test-artifacts',
        'advancedSettings'
      )
    );
    expect(getVisualRegressionTestArtifactsDir('run-id', 'advancedSettings', 'my-test-local')).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'test-artifacts',
        'vrt',
        'run-id',
        'test-artifacts',
        'advancedSettings',
        'my-test-local'
      )
    );
    expect(
      getVisualRegressionActualPath('run-id', 'advancedSettings', 'my-test-local', '01_step.png')
    ).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'test-artifacts',
        'vrt',
        'run-id',
        'test-artifacts',
        'advancedSettings',
        'my-test-local',
        '01_step.png'
      )
    );
    expect(
      getVisualRegressionDiffPath('run-id', 'advancedSettings', 'my-test-local', '01_step.png')
    ).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'test-artifacts',
        'vrt',
        'run-id',
        'test-artifacts',
        'advancedSettings',
        'my-test-local',
        '01_step-diff.png'
      )
    );
  });

  it('keeps the raw Playwright output separate from the Driftik-facing tree', () => {
    expect(getVisualRegressionPlaywrightArtifactsDir('run-id')).toBe(
      path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt', 'run-id', 'playwright-artifacts')
    );
  });

  it('writes manifests per package so multiple packages can share a run id', () => {
    expect(getVisualRegressionManifestPath('run-id', 'advancedSettings')).toBe(
      path.join(
        REPO_ROOT,
        '.scout',
        'test-artifacts',
        'vrt',
        'run-id',
        'test-artifacts',
        'advancedSettings',
        'manifest.json'
      )
    );
    expect(getVisualRegressionRunManifestPath('run-id')).toBe(
      path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt', 'run-id', 'manifest.json')
    );
  });

  it('can express baseline and artifact files relative to the run root', () => {
    expect(
      toRunRelativePath(
        'run-id',
        path.join(
          REPO_ROOT,
          '.scout',
          'test-artifacts',
          'vrt',
          'run-id',
          'test-artifacts',
          'advancedSettings',
          'my-test-local',
          '01_step.png'
        )
      )
    ).toBe(path.join('test-artifacts', 'advancedSettings', 'my-test-local', '01_step.png'));

    expect(
      toRunRelativePath(
        'run-id',
        path.join(
          REPO_ROOT,
          '.scout',
          'baselines',
          'vrt',
          'advancedSettings',
          'my-test-local',
          '01_step.png'
        )
      )
    ).toBe(
      path.join(
        '..',
        '..',
        '..',
        'baselines',
        'vrt',
        'advancedSettings',
        'my-test-local',
        '01_step.png'
      )
    );
  });
});
