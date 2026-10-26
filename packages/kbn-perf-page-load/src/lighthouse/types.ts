/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Flags, RunnerResult } from 'lighthouse';

export interface ThrottlingConfig {
  rttMs?: number;
  throughputKbps?: number;
  downloadThroughputKbps?: number;
  uploadThroughputKbps?: number;
  cpuSlowdownMultiplier?: number;
}

export const DEVTOOLS_DESKTOP_THROTTLING: ThrottlingConfig = {
  rttMs: 40,
  throughputKbps: 10 * 1024,
  downloadThroughputKbps: 10 * 1024,
  uploadThroughputKbps: 5 * 1024,
  cpuSlowdownMultiplier: 4,
};

export interface PerfLighthouseAuditOptions {
  throttlingMethod?: 'provided' | 'devtools' | 'simulate';
  throttling?: ThrottlingConfig;
  maxWaitForLoad?: number;
  screenEmulation?: {
    width: number;
    height: number;
  };
  onlyCategories?: string[];
}

export type PerfLighthouseFlags = Partial<Flags>;

export interface PerfLighthouseFixture {
  runAudit: (url: string, options?: PerfLighthouseAuditOptions) => Promise<RunnerResult>;
}
