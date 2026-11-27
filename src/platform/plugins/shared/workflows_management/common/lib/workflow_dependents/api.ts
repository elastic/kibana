/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RemovalImpact } from './types';

/** Internal route that lists what fails when workflows are turned off or deleted. */
export const WORKFLOW_REMOVAL_IMPACT_ROUTE = '/internal/workflows/_removal_impact';

/** Upper bound of workflow IDs one removal impact request checks, matching bulk actions. */
export const MAX_REMOVAL_IMPACT_IDS = 1000;

export interface WorkflowRemovalImpactRequestBody {
  ids: string[];
}

export type WorkflowRemovalImpactResponse = RemovalImpact;
