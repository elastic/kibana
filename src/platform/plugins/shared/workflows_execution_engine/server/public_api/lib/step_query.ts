/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { buildTimeRangeFilter, visibilityMustNot } from './query';
import type { StepSearchCriteria, StepSort } from '../types';

/** Bool query shared by `searchSteps` and `getStepFacets`. */
export const buildStepSearchQuery = (
  criteria: StepSearchCriteria
): estypes.QueryDslQueryContainer => {
  const must: estypes.QueryDslQueryContainer[] = [{ term: { spaceId: criteria.spaceId } }];
  const mustNot: estypes.QueryDslQueryContainer[] = [...visibilityMustNot(criteria.visibility)];

  if (criteria.executionId !== undefined) {
    must.push({ term: { workflowRunId: criteria.executionId } });
  }
  if (criteria.executionIds) {
    must.push({ terms: { workflowRunId: [...criteria.executionIds] } });
  }
  if (criteria.workflowId !== undefined) {
    must.push({ term: { workflowId: criteria.workflowId } });
  }
  if (criteria.workflowIds && criteria.workflowIds.length > 0) {
    must.push({ terms: { workflowId: [...criteria.workflowIds] } });
  }
  if (criteria.stepId !== undefined) {
    must.push({ term: { stepId: criteria.stepId } });
  }
  if (criteria.stepType !== undefined) {
    must.push({ term: { stepType: criteria.stepType } });
  }
  if (criteria.statuses?.length === 1) {
    must.push({ term: { status: criteria.statuses[0] } });
  } else if (criteria.statuses && criteria.statuses.length > 1) {
    must.push({ terms: { status: [...criteria.statuses] } });
  }
  if (criteria.channel && criteria.channel.length > 0) {
    must.push({ terms: { 'hitl.channel': [...criteria.channel] } });
  }
  if (criteria.respondedBy && criteria.respondedBy.length > 0) {
    must.push({ terms: { 'hitl.respondedBy': [...criteria.respondedBy] } });
  }
  const queryText = criteria.q;
  if (queryText && queryText.length > 0) {
    must.push({
      bool: {
        should: ['hitl.respondedBy', 'workflowId', 'stepId'].map((field) => ({
          prefix: {
            [field]: { value: queryText, case_insensitive: true },
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  const startedAtRange = buildTimeRangeFilter(
    'startedAt',
    criteria.startedAfter,
    criteria.startedBefore
  );
  if (startedAtRange) {
    must.push(startedAtRange);
  }
  if (criteria.finishedBefore) {
    must.push({ range: { finishedAt: { lte: criteria.finishedBefore } } });
  }

  const bool: estypes.QueryDslBoolQuery = { must };
  if (criteria.settlement === 'processed') {
    bool.should = [{ exists: { field: 'finishedAt' } }, { exists: { field: 'hitl.respondedAt' } }];
    bool.minimum_should_match = 1;
  }
  if (criteria.settlement === 'open') {
    mustNot.push({ exists: { field: 'finishedAt' } }, { exists: { field: 'hitl.respondedAt' } });
  }
  if (mustNot.length > 0) {
    bool.must_not = mustNot;
  }
  return { bool };
};

export const stepSort = (sort: StepSort = 'startedAt:desc'): estypes.Sort => {
  if (sort === 'startedAt:asc' || sort === 'startedAt:desc') {
    return sort;
  }
  const order = sort === 'respondedAt:asc' ? 'asc' : 'desc';
  return [
    { 'hitl.respondedAt': { order, missing: '_last' } },
    { finishedAt: { order, missing: '_last' } },
  ];
};
