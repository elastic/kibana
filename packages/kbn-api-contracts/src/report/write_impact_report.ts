/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { StabilityTier } from '../stability';

/**
 * A single breaking change, tier-classified. Every reported change carries its
 * tier: stable and tech_preview gate the build, experimental is reported for
 * visibility only. The notifier and CI log key their sections off this field.
 */
export interface ImpactReportEntry {
  path: string;
  method?: string;
  reason: string;
  oasdiffId?: string;
  source?: string;
  tier: StabilityTier;
  since?: string;
}

export interface ImpactReport {
  entries: ImpactReportEntry[];
}

/** Write the tier-labeled impact report consumed by the PR notifier. */
export const writeImpactReport = (reportPath: string, report: ImpactReport): void => {
  mkdirSync(resolve(reportPath, '..'), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
};
