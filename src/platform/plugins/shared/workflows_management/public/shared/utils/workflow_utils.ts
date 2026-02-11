/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import { omit } from 'lodash';
import type { WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';

export interface WorkflowsData {
  total: number;
}

export function shouldShowWorkflowsEmptyState(
  workflows: WorkflowsData | undefined,
  search: WorkflowsSearchParams
): boolean {
  const hasNoWorkflows = workflows?.total === 0;
  const hasNoFilters =
    !search.query &&
    (!search.enabled || search.enabled.length === 0) &&
    (!search.createdBy || search.createdBy.length === 0);

  return hasNoWorkflows && hasNoFilters;
}

export function areSimilarResults(
  newWorkflows: WorkflowListDto | undefined,
  oldWorkflows: WorkflowListDto | undefined
): boolean {
  if (!newWorkflows || !oldWorkflows) {
    return false;
  }

  const oldWorkflowsResults = new Map(oldWorkflows.results.map((r) => [r.id, r]));

  // Check whether the results are very similar
  // The similarity definition is based on the following criteria:
  // 1. The number of results is the same
  // 2. The results are equal, except for the lastUpdatedAt prop
  // 3. Only the enabled prop has changed AND the yaml enabled prop has changed from true to false or vice versa
  //    * for the second part to avoid performance issues with the yaml comparison the check is pretty shallow,
  //      but hopefully not too much to generate false positives
  return (
    newWorkflows.results.length === oldWorkflowsResults.size &&
    newWorkflows.results.every((r) => {
      const prevR = oldWorkflowsResults.get(r.id);
      if (!prevR) {
        return false;
      }

      const areEqual = fastIsEqual(omit(prevR, ['lastUpdatedAt']), omit(r, ['lastUpdatedAt']));
      if (areEqual) {
        return true;
      }
      return (
        // check that enabled has changed
        r.enabled === !prevR?.enabled &&
        // shallow check that yaml has changed from true to false or vice versa
        'yaml' in r &&
        typeof r.yaml === 'string' &&
        'yaml' in prevR &&
        typeof prevR.yaml === 'string' &&
        Math.abs(r.yaml?.length - prevR?.yaml.length) === 1
      );
    })
  );
}
