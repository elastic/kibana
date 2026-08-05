/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
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

  it.each([
    ['ab', 1, 'regression', 0, 'preserving artifacts'],
    ['aa', 0, 'observed', 0, ''],
  ] as const)(
    'accepts %s with status %s and outcome %s',
    (orientation, benchmarkStatus, outcome, expectedStatus, expectedOutput) => {
      const result = runReportValidation(orientation, benchmarkStatus, outcome);

      expect(result.status).toBe(expectedStatus);
      expect(result.stdout + result.stderr).toContain(expectedOutput);
    }
  );

  it.each([
    ['ab', 0, 'regression', 'missed expected ab regression'],
    ['ab', 0, 'observed', 'expected regression for orientation ab'],
    ['ba', 1, 'observed', 'benchmark failed'],
    ['ba', 1, 'regression', 'expected observed for orientation ba'],
  ] as const)(
    'rejects %s with status %s and outcome %s',
    (orientation, benchmarkStatus, outcome, expectedOutput) => {
      const result = runReportValidation(orientation, benchmarkStatus, outcome);

      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain(expectedOutput);
    }
  );

  it('rejects a report without a valid outcome', () => {
    const result = runReportValidation('aa', 0, undefined);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('report is invalid');
  });
});

const runReportValidation = (
  orientation: 'aa' | 'ab' | 'ba',
  benchmarkStatus: number,
  outcome?: string
) => {
  const tempDir = mkdtempSync('/tmp/run-calibration-test-');
  const reportPath = path.join(tempDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(outcome === undefined ? {} : { outcome }));

  try {
    return spawnSync(
      'bash',
      [
        '-c',
        '{ script="$1"; orientation="$2"; status="$3"; report="$4"; set --; source "$script"; ORIENTATION="$orientation"; validate_benchmark_result "$status" "$report"; }',
        '--',
        RUN_CALIBRATION_SH,
        orientation,
        String(benchmarkStatus),
        reportPath,
      ],
      { encoding: 'utf8' }
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};
