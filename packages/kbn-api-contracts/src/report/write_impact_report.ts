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

/**
 * Tiers the checker acts on. Experimental breaking changes are dropped upstream
 * (in check_contracts) and never reach the report, so a reported entry is always
 * stable or tech_preview.
 */
export type CaughtTier = 'stable' | 'tech_preview';

/**
 * A single caught breaking change, tier-classified. Terraform fields are
 * ownership enrichment, present only when the change maps to a provider API;
 * they never affect whether the change is caught.
 */
export interface ImpactReportEntry {
  path: string;
  method?: string;
  reason: string;
  oasdiffId?: string;
  source?: string;
  tier: CaughtTier;
  since?: string;
  terraformResource?: string;
  owners?: string[];
}

export interface ImpactReport {
  entries: ImpactReportEntry[];
}

/** Write the tier-labeled impact report consumed by the PR notifier. */
export const writeImpactReport = (reportPath: string, report: ImpactReport): void => {
  mkdirSync(resolve(reportPath, '..'), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
};
