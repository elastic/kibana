/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Platform, ScreenshotArtifact } from '../../types';
import { SetTestsPayload, Test } from './test';

export interface Screenshot {
  screenshotId: string;
  name: string | null;
  testId: string;
  takenAt: string;
  height: number;
  width: number;
  screenshotURL: string;
}

export interface InstanceResultStats {
  suites: number;
  tests: number;
  passes: number;
  pending: number;
  skipped: number;
  failures: number;
  wallClockStartedAt: string;
  wallClockEndedAt: string;
  wallClockDuration: number;
}

export interface ReporterStats {
  suites: number;
  tests: number;
  passes: number;
  pending: number;
  failures: number;
  start: string;
  end: string;
  duration: number;
}

export interface CypressConfig {
  video: boolean;
  videoUploadOnPasses: boolean;
  [key: string]: any;
}

export interface InstanceResult {
  stats: InstanceResultStats;
  tests: Test[];
  error?: string;
  reporterStats: ReporterStats;
  exception: null | string;
  cypressConfig?: PickedCypressConfig | null;
  screenshots: Screenshot[];
  video: boolean;
  videoUrl?: string;
}

export interface AssetUploadInstruction {
  uploadUrl: string;
  readUrl: string;
}

export interface ScreenshotUploadInstruction extends AssetUploadInstruction {
  screenshotId: string;
}

export type SetResultsTestsPayload = Pick<Test, 'state' | 'displayError' | 'attempts'> & {
  clientId: string;
};

export interface SetInstanceTestsPayload {
  config: PickedCypressConfig;
  tests: SetTestsPayload[];
  hooks: CypressCommandLine.RunResult['hooks'];
}

export type PickedCypressConfig = Pick<CypressConfig, 'video' | 'videoUploadOnPasses'>;

export interface CreateInstancePayload {
  runId: string;
  groupId: string;
  machineId: string;
  platform: Platform;
}

export type CreateInstanceCyPayload = CreateInstancePayload & {
  batchSize: number;
};
export interface CreateInstanceResponse {
  spec: string | null;
  instanceId: string | null;
  claimedInstances: number;
  totalInstances: number;
}

export interface InstanceResponseSpecDetails {
  spec: string;
  instanceId: string;
}
export interface CreateInstancesResponse {
  specs: InstanceResponseSpecDetails[];
  claimedInstances: number;
  totalInstances: number;
}

export type UpdateInstanceResultsPayload = Pick<InstanceResult, 'stats' | 'exception' | 'video'> & {
  tests: SetResultsTestsPayload[] | null;
} & {
  reporterStats: CypressCommandLine.RunResult['reporterStats'] | null;
} & {
  screenshots: ScreenshotArtifact[];
};

export interface UpdateInstanceResultsMergedPayload {
  tests: SetInstanceTestsPayload;
  results: UpdateInstanceResultsPayload;
}

export interface UpdateInstanceResultsResponse {
  videoUploadUrl?: string | null;
  screenshotUploadUrls: ScreenshotUploadInstruction[];
  cloud?: {
    shouldCancel: false | string;
  };
}
