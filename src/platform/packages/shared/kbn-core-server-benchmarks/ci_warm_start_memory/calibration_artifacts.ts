/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const KIBANA_ON_MERGE_PIPELINE_SLUG = 'kibana-on-merge';

/**
 * Linux calibration pins for flaky-runner campaigns against a known
 * fixed-vs-regressed pair. These Buildkite artifact IDs reference on-merge
 * distributables from builds 104029/104030; bytes expire per Buildkite
 * artifact retention policy — refresh the pins before the next campaign if
 * downloads start failing.
 *
 * Keep these constants in sync with run_calibration.sh.
 */

export const KIBANA_DISTRIBUTABLE_ARTIFACT_FILENAME = 'kibana-default.tar.zst';

export const CALIBRATION_WORK_DIR = 'target/ci-warm-start-memory-bench';

export const CALIBRATION_MANIFEST_PATH = `${CALIBRATION_WORK_DIR}/warm_start_calibration_manifest.json`;

export const CALIBRATION_REPORT_PATH = `${CALIBRATION_WORK_DIR}/warm_start_memory_regression_report.json`;

export const CALIBRATION_LEFT_BUILD_DIR = `${CALIBRATION_WORK_DIR}/left`;

export const CALIBRATION_RIGHT_BUILD_DIR = `${CALIBRATION_WORK_DIR}/right`;

export const CALIBRATION_ORIENTATION_ENV = 'KIBANA_CI_WARM_START_MEMORY_CALIBRATION_ORIENTATION';

export const CALIBRATION_BENCH_CONFIG_PATH =
  'src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory.benchmark.config.ts';

export interface WarmStartCalibrationArtifact {
  readonly id: 'A' | 'B';
  readonly label: 'fixed' | 'regressed';
  readonly buildNumber: number;
  readonly buildId: string;
  readonly commitSha: string;
  readonly artifactId: string;
  readonly artifactPath: typeof KIBANA_DISTRIBUTABLE_ARTIFACT_FILENAME;
  readonly buildUrl: string;
  readonly sha1: string;
  readonly sha256: string;
}

export const WARM_START_CALIBRATION_ARTIFACT_A: WarmStartCalibrationArtifact = {
  id: 'A',
  label: 'fixed',
  buildNumber: 104030,
  buildId: '019f94c0-d0d9-4944-84fc-27beda66beb7',
  commitSha: 'c068037b308eaa40c835e1016392587e2680e914',
  artifactId: '019f94ce-f550-455f-aab2-e12c621e6221',
  artifactPath: KIBANA_DISTRIBUTABLE_ARTIFACT_FILENAME,
  buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/104030',
  sha1: '04668f26ee720ff5f15af88188851e7382127c76',
  sha256: 'ca34fb9db6425c81c8c25b8aac382d9d39899fe2bdd57179f7aad13e8c272779',
};

export const WARM_START_CALIBRATION_ARTIFACT_B: WarmStartCalibrationArtifact = {
  id: 'B',
  label: 'regressed',
  buildNumber: 104029,
  buildId: '019f94c0-70a2-4080-9082-0837dd577955',
  commitSha: 'f34aaebb053fee8e04cbb673551356e532819b8f',
  artifactId: '019f94cf-911f-4059-9a1c-af5a7f30a521',
  artifactPath: KIBANA_DISTRIBUTABLE_ARTIFACT_FILENAME,
  buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/104029',
  sha1: 'ae342f24aa51285ac5d7ea94de0a15ce1c202ad5',
  sha256: '2e12f9a5fa18ebf59121ff9ee3d80cbdbd273c77d8f83ce189793f119a050ca2',
};

export const WARM_START_CALIBRATION_ARTIFACTS = {
  A: WARM_START_CALIBRATION_ARTIFACT_A,
  B: WARM_START_CALIBRATION_ARTIFACT_B,
} as const;

export type WarmStartCalibrationOrientation = 'aa' | 'ab' | 'ba';

export interface WarmStartCalibrationSideSelection {
  readonly orientation: WarmStartCalibrationOrientation;
  readonly left: WarmStartCalibrationArtifact;
  readonly right: WarmStartCalibrationArtifact;
}

export const resolveWarmStartCalibrationOrientation = (
  orientationInput: string | undefined
): WarmStartCalibrationSideSelection => {
  const normalized = (orientationInput ?? 'ab').trim().toLowerCase();

  if (!/^(aa|ab|ba)$/.test(normalized)) {
    throw new Error(
      `Invalid warm-start calibration orientation "${orientationInput}". Expected aa, ab, or ba.`
    );
  }

  const orientation = normalized as WarmStartCalibrationOrientation;
  const left =
    orientation === 'ba' ? WARM_START_CALIBRATION_ARTIFACT_B : WARM_START_CALIBRATION_ARTIFACT_A;
  const right =
    orientation === 'aa'
      ? WARM_START_CALIBRATION_ARTIFACT_A
      : orientation === 'ab'
      ? WARM_START_CALIBRATION_ARTIFACT_B
      : WARM_START_CALIBRATION_ARTIFACT_A;

  return {
    orientation,
    left,
    right,
  };
};

export interface WarmStartCalibrationManifest {
  readonly version: 1;
  readonly orientation: WarmStartCalibrationOrientation;
  readonly generatedAt: string;
  readonly pipelineSlug: typeof KIBANA_ON_MERGE_PIPELINE_SLUG;
  readonly left: WarmStartCalibrationArtifact;
  readonly right: WarmStartCalibrationArtifact;
  readonly extractDirs: {
    readonly left: typeof CALIBRATION_LEFT_BUILD_DIR;
    readonly right: typeof CALIBRATION_RIGHT_BUILD_DIR;
  };
  readonly reportPath: typeof CALIBRATION_REPORT_PATH;
}

export const createWarmStartCalibrationManifest = ({
  selection,
  generatedAt = new Date().toISOString(),
}: {
  readonly selection: WarmStartCalibrationSideSelection;
  readonly generatedAt?: string;
}): WarmStartCalibrationManifest => ({
  version: 1,
  orientation: selection.orientation,
  generatedAt,
  pipelineSlug: KIBANA_ON_MERGE_PIPELINE_SLUG,
  left: selection.left,
  right: selection.right,
  extractDirs: {
    left: CALIBRATION_LEFT_BUILD_DIR,
    right: CALIBRATION_RIGHT_BUILD_DIR,
  },
  reportPath: CALIBRATION_REPORT_PATH,
});
