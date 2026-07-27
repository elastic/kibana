/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CALIBRATION_LEFT_BUILD_DIR,
  CALIBRATION_MANIFEST_PATH,
  CALIBRATION_REPORT_PATH,
  CALIBRATION_RIGHT_BUILD_DIR,
  createWarmStartCalibrationManifest,
  resolveWarmStartCalibrationOrientation,
  WARM_START_CALIBRATION_ARTIFACT_A,
  WARM_START_CALIBRATION_ARTIFACT_B,
} from './calibration_artifacts';

describe('warm-start calibration artifacts', () => {
  it('records the fixed APM distributable from build 104030', () => {
    expect(WARM_START_CALIBRATION_ARTIFACT_A).toEqual(
      expect.objectContaining({
        buildNumber: 104030,
        commitSha: 'c068037b308eaa40c835e1016392587e2680e914',
        artifactId: '019f94ce-f550-455f-aab2-e12c621e6221',
        sha1: '04668f26ee720ff5f15af88188851e7382127c76',
        sha256: 'ca34fb9db6425c81c8c25b8aac382d9d39899fe2bdd57179f7aad13e8c272779',
      })
    );
  });

  it('records the regressed APM distributable from build 104029', () => {
    expect(WARM_START_CALIBRATION_ARTIFACT_B).toEqual(
      expect.objectContaining({
        buildNumber: 104029,
        commitSha: 'f34aaebb053fee8e04cbb673551356e532819b8f',
        artifactId: '019f94cf-911f-4059-9a1c-af5a7f30a521',
        sha1: 'ae342f24aa51285ac5d7ea94de0a15ce1c202ad5',
        sha256: '2e12f9a5fa18ebf59121ff9ee3d80cbdbd273c77d8f83ce189793f119a050ca2',
      })
    );
  });

  it('maps aa to the same fixed artifact on both sides', () => {
    expect(resolveWarmStartCalibrationOrientation('aa')).toEqual({
      orientation: 'aa',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_A,
      seed: 'calibration-linux-aa',
    });
  });

  it('maps ab to fixed left and regressed right', () => {
    expect(resolveWarmStartCalibrationOrientation('ab')).toEqual({
      orientation: 'ab',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_B,
      seed: 'calibration-linux-ab',
    });
  });

  it('maps ba to regressed left and fixed right', () => {
    expect(resolveWarmStartCalibrationOrientation('ba')).toEqual({
      orientation: 'ba',
      left: WARM_START_CALIBRATION_ARTIFACT_B,
      right: WARM_START_CALIBRATION_ARTIFACT_A,
      seed: 'calibration-linux-ba',
    });
  });

  it('accepts an explicit seed override', () => {
    expect(resolveWarmStartCalibrationOrientation('ab', 'custom-seed')).toEqual(
      expect.objectContaining({
        orientation: 'ab',
        seed: 'custom-seed',
      })
    );
  });

  it('rejects unknown orientations', () => {
    expect(() => resolveWarmStartCalibrationOrientation('bb')).toThrow(
      /Invalid warm-start calibration orientation/
    );
  });

  it('writes a manifest with immutable artifact provenance', () => {
    const selection = resolveWarmStartCalibrationOrientation('ab', 'seed-1');
    expect(
      createWarmStartCalibrationManifest({
        selection,
        generatedAt: '2026-07-27T00:00:00.000Z',
      })
    ).toEqual({
      version: 1,
      orientation: 'ab',
      seed: 'seed-1',
      generatedAt: '2026-07-27T00:00:00.000Z',
      pipelineSlug: 'kibana-on-merge',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_B,
      extractDirs: {
        left: CALIBRATION_LEFT_BUILD_DIR,
        right: CALIBRATION_RIGHT_BUILD_DIR,
      },
      reportPath: CALIBRATION_REPORT_PATH,
    });
    expect(CALIBRATION_MANIFEST_PATH).toBe(
      'target/ci-warm-start-memory-bench/warm_start_calibration_manifest.json'
    );
  });
});
