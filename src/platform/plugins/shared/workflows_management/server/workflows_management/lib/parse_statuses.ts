/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';

export const WORKFLOW_EXECUTION_STATUSES = Object.values(ExecutionStatus);
export function parseStatuses(statuses: string | string[]): ExecutionStatus[] {
  const parsedStatuses: ExecutionStatus[] = [];
  if (typeof statuses === 'string') {
    statuses = [statuses];
  }
  for (const status of statuses) {
    if (!WORKFLOW_EXECUTION_STATUSES.includes(status as ExecutionStatus)) {
      throw new Error(`Invalid status: ${status}`);
    }
    parsedStatuses.push(status as ExecutionStatus);
  }
  return parsedStatuses;
}
