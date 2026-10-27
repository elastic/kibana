/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';

const buildCustomFilter = (query: Filter['query']): Filter => ({
  meta: {
    type: FILTERS.CUSTOM,
    disabled: false,
    negate: false,
    alias: null,
  },
  query,
});

/**
 * Parent filter that keeps step runs out of the options-list aggregations, as the executions list does.
 */
export const buildExcludeStepRunsFilter = (): Filter =>
  buildCustomFilter({ bool: { must_not: { exists: { field: 'stepId' } } } });

/**
 * Parent filter that limits the options-list aggregations to the workflows the user can read.
 * The options lists read the execution data as the current user, which does not apply workflow access control.
 */
export const buildReadableWorkflowsFilter = (workflowIds: string[]): Filter =>
  buildCustomFilter({ terms: { workflowId: workflowIds } });
