/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createWarmStartCalibrationManifest,
  resolveWarmStartCalibrationOrientation,
  WARM_START_CALIBRATION_ARTIFACT_A,
  WARM_START_CALIBRATION_ARTIFACT_B,
} from './calibration_artifacts';

describe('warm-start calibration artifacts', () => {
  it('resolves aa, ab, and ba orientations', () => {
    expect(resolveWarmStartCalibrationOrientation('aa')).toEqual({
      orientation: 'aa',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_A,
    });
    expect(resolveWarmStartCalibrationOrientation('ab')).toEqual({
      orientation: 'ab',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_B,
    });
    expect(resolveWarmStartCalibrationOrientation('ba')).toEqual({
      orientation: 'ba',
      left: WARM_START_CALIBRATION_ARTIFACT_B,
      right: WARM_START_CALIBRATION_ARTIFACT_A,
    });
  });

  it('rejects unknown orientations', () => {
    expect(() => resolveWarmStartCalibrationOrientation('ac')).toThrow(
      /Invalid warm-start calibration orientation/
    );
  });

  it('builds a schema-complete manifest without a seed', () => {
    const selection = resolveWarmStartCalibrationOrientation('ab');
    const manifest = createWarmStartCalibrationManifest({
      selection,
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(manifest).toEqual({
      version: 1,
      orientation: 'ab',
      generatedAt: '2026-01-01T00:00:00.000Z',
      pipelineSlug: 'kibana-on-merge',
      left: WARM_START_CALIBRATION_ARTIFACT_A,
      right: WARM_START_CALIBRATION_ARTIFACT_B,
      extractDirs: {
        left: 'target/ci-warm-start-memory-bench/left',
        right: 'target/ci-warm-start-memory-bench/right',
      },
      reportPath: 'target/ci-warm-start-memory-bench/warm_start_memory_regression_report.json',
    });
    expect(manifest).not.toHaveProperty('seed');
  });
});
