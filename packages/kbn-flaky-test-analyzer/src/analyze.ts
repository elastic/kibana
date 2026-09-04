/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ESClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'node:fs';
import path from 'node:path';
import type { FlakinessReport, PolicySnapshot } from './report/schema';
import { FLAKINESS_REPORT_SCHEMA_VERSION, FlakinessReportSchema } from './report/schema';
import { partitionSpecs } from './policy/policy';
import { buildSpecClusters } from './clustering/spec_clusters';
import {
  fetchFailureSamples,
  fetchSpecObservations,
  fetchTestObservations,
} from './query/flakiness_query';

const FAILURE_SAMPLE_LIMIT = 5000;

export interface AnalyzeFlakinessOptions {
  policy: PolicySnapshot;
  log?: ToolingLog;
}

/**
 * Produces the flakiness report: one expensive file-level scan, then test-level and failure
 * detail scoped to only the specs that cleared the admission bar.
 */
export const analyzeFlakiness = async (
  es: ESClient,
  { policy, log }: AnalyzeFlakinessOptions
): Promise<FlakinessReport> => {
  const to = new Date();
  const from = new Date(to.getTime() - policy.lookbackDays * 24 * 60 * 60 * 1000);
  const scope = {
    lookbackDays: policy.lookbackDays,
    pipelineSlugs: policy.pipelineSlugs,
    branches: policy.branches,
  };

  log?.info(`Fetching spec-level rates over the past ${policy.lookbackDays}d`);
  const specs = await fetchSpecObservations(es, scope);
  log?.info(`Found ${specs.length} spec files with at least one failure`);

  const { admitted } = partitionSpecs(specs, policy);
  const filePaths = [...new Set(admitted.map((spec) => spec.filePath))];
  log?.info(`${admitted.length} specs cleared the admission bar`);

  const [tests, samples] = await Promise.all([
    fetchTestObservations(es, { ...scope, filePaths }),
    fetchFailureSamples(es, { ...scope, filePaths, limit: FAILURE_SAMPLE_LIMIT }),
  ]);
  log?.info(`Fetched ${tests.length} test rows and ${samples.length} failure samples`);

  const { clusters, suppressed } = buildSpecClusters({ specs, tests, samples, policy });

  return FlakinessReportSchema.parse({
    schemaVersion: FLAKINESS_REPORT_SCHEMA_VERSION,
    generatedAt: to,
    window: { lookbackDays: policy.lookbackDays, from, to },
    policy,
    clusters,
    suppressed,
  });
};

export const writeReportToFile = (report: FlakinessReport, outputPath: string): void => {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
};

export const readReportFromFile = (reportPath: string): FlakinessReport => {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Flakiness report not found at ${reportPath}`);
  }

  return FlakinessReportSchema.parse(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
};
