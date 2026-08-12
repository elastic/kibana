/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** Outcome of the per-boot inference-endpoint preflight check. */
export interface InferenceEndpointPreflightReport {
  /** Inference IDs whose endpoints were confirmed to exist. */
  checked: string[];
  /** Inference IDs whose endpoints returned 404. Semantic search will be degraded for types using these. */
  missing: string[];
  /** Inference IDs whose endpoints could not be verified due to a non-404 error. */
  errors: Array<{ inferenceId: string; error: string }>;
}

const is404 = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { meta?: { statusCode?: number } }).meta?.statusCode === 404;

/**
 * Checks whether each given inference endpoint exists in ES.
 * Resolves with a structured report and never throws — all failures are captured in the report.
 */
export const ensureInferenceEndpoints = async (
  client: ElasticsearchClient,
  inferenceIds: ReadonlyArray<string>
): Promise<InferenceEndpointPreflightReport> => {
  const report: InferenceEndpointPreflightReport = {
    checked: [],
    missing: [],
    errors: [],
  };

  for (const inferenceId of inferenceIds) {
    try {
      await client.inference.get({ inference_id: inferenceId });
      report.checked.push(inferenceId);
    } catch (err) {
      if (is404(err)) {
        report.missing.push(inferenceId);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        report.errors.push({ inferenceId, error: message });
      }
    }
  }

  return report;
};
