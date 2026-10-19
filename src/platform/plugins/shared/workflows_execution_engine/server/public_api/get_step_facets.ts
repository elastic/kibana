/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { isIndexNotFoundError, isVisibilityDenied } from './lib/query';
import { buildStepSearchQuery } from './lib/step_query';
import type {
  ExecutionReadDeps,
  GetStepFacetsParams,
  StepFacetCounts,
  StepFacetField,
} from './types';

const FACET_FIELD: Record<StepFacetField, string> = {
  status: 'status',
  stepType: 'stepType',
  workflowId: 'workflowId',
  'hitl.channel': 'hitl.channel',
  'hitl.respondedBy': 'hitl.respondedBy',
};

const bucketsToFacet = (
  buckets: estypes.AggregationsStringTermsBucket[] | undefined
): Array<{ value: string; count: number }> => {
  if (!buckets) return [];
  return buckets
    .map((bucket) => ({
      value: typeof bucket.key === 'string' ? bucket.key : String(bucket.key ?? ''),
      count: bucket.doc_count,
    }))
    .filter((entry) => entry.value.length > 0);
};

/**
 * Returns term counts for the requested step fields. No documents are returned.
 * Criteria match `searchSteps`, including a whole-space search. `visibility: deny` returns empty buckets.
 * `fields` is an allowlist. `maxBuckets` defaults to 50. An empty index returns empty buckets.
 */
export const getStepFacets = async (
  deps: ExecutionReadDeps,
  { fields, maxBuckets = 50, ...criteria }: GetStepFacetsParams
): Promise<StepFacetCounts> => {
  const empty = Object.fromEntries(fields.map((field) => [field, []])) as StepFacetCounts;
  if (fields.length === 0 || isVisibilityDenied(criteria.visibility)) {
    return empty;
  }

  try {
    const response = await deps.stepExecutionsDataClient.search({
      size: 0,
      query: buildStepSearchQuery(criteria),
      aggs: Object.fromEntries(
        fields.map((field) => [field, { terms: { field: FACET_FIELD[field], size: maxBuckets } }])
      ),
      track_total_hits: false,
    });
    const aggregations = response.aggregations ?? {};
    const counts: StepFacetCounts = {};
    for (const field of fields) {
      const aggregate = aggregations[field] as estypes.AggregationsStringTermsAggregate | undefined;
      const buckets = aggregate?.buckets;
      counts[field] = bucketsToFacet(Array.isArray(buckets) ? buckets : undefined);
    }
    return counts;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return empty;
    }
    deps.logger.error(`Failed to compute step facets: ${error}`);
    throw error;
  }
};
