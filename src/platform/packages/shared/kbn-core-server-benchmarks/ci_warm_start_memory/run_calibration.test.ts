/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import path from 'path';
import {
  resolveWarmStartCalibrationOrientation,
  WARM_START_CALIBRATION_ARTIFACT_A,
  WARM_START_CALIBRATION_ARTIFACT_B,
} from './calibration_artifacts';

const RUN_CALIBRATION_SH = path.join(__dirname, 'run_calibration.sh');

const readShellConstant = (name: string): string => {
  const script = readFileSync(RUN_CALIBRATION_SH, 'utf8');
  const match = script.match(new RegExp(`^${name}="([^"]+)"`, 'm'));
  if (!match) {
    throw new Error(`Missing shell constant ${name} in run_calibration.sh`);
  }
  return match[1];
};

describe('run_calibration.sh metadata', () => {
  it('keeps artifact A constants aligned with calibration_artifacts.ts', () => {
    expect(readShellConstant('A_BUILD_ID')).toBe(WARM_START_CALIBRATION_ARTIFACT_A.buildId);
    expect(readShellConstant('A_BUILD_NUMBER')).toBe(
      String(WARM_START_CALIBRATION_ARTIFACT_A.buildNumber)
    );
    expect(readShellConstant('A_COMMIT')).toBe(WARM_START_CALIBRATION_ARTIFACT_A.commitSha);
    expect(readShellConstant('A_ARTIFACT_ID')).toBe(WARM_START_CALIBRATION_ARTIFACT_A.artifactId);
    expect(readShellConstant('A_SHA1')).toBe(WARM_START_CALIBRATION_ARTIFACT_A.sha1);
    expect(readShellConstant('A_SHA256')).toBe(WARM_START_CALIBRATION_ARTIFACT_A.sha256);
  });

  it('keeps artifact B constants aligned with calibration_artifacts.ts', () => {
    expect(readShellConstant('B_BUILD_ID')).toBe(WARM_START_CALIBRATION_ARTIFACT_B.buildId);
    expect(readShellConstant('B_BUILD_NUMBER')).toBe(
      String(WARM_START_CALIBRATION_ARTIFACT_B.buildNumber)
    );
    expect(readShellConstant('B_COMMIT')).toBe(WARM_START_CALIBRATION_ARTIFACT_B.commitSha);
    expect(readShellConstant('B_ARTIFACT_ID')).toBe(WARM_START_CALIBRATION_ARTIFACT_B.artifactId);
    expect(readShellConstant('B_SHA1')).toBe(WARM_START_CALIBRATION_ARTIFACT_B.sha1);
    expect(readShellConstant('B_SHA256')).toBe(WARM_START_CALIBRATION_ARTIFACT_B.sha256);
  });

  it('uses the same default seeds as the TypeScript resolver', () => {
    for (const orientation of ['aa', 'ab', 'ba'] as const) {
      expect(resolveWarmStartCalibrationOrientation(orientation).seed).toBe(
        `calibration-linux-${orientation}`
      );
    }
  });

  it('preserves reports for the expected B regression but fails other benchmark errors', () => {
    const script = readFileSync(RUN_CALIBRATION_SH, 'utf8');

    expect(script).toContain(
      'Expected warm-start regression produced report; preserving artifacts'
    );
    expect(script).toContain('[[ "${ORIENTATION}" != "ab" && "${ORIENTATION}" != "ba" ]]');
    expect(script).toContain('exit "${benchmark_status}"');
  });
});
