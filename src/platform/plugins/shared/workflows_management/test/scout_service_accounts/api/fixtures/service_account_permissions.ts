/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';

export const readStep = (index: string, name = 'read'): string => `  - name: ${name}
    type: elasticsearch.request
    with:
      method: GET
      path: /${index}/_doc/readable
`;
export const writeStep = (index: string, id: string): string => `  - name: write
    type: elasticsearch.request
    with:
      method: PUT
      path: /${index}/_doc/${id}
      body:
        message: write probe
`;
export const expectReadOnlyFailure = (execution: WorkflowExecutionDto, accountId: string): void => {
  expect(execution.effectiveIdentity).toStrictEqual({ type: 'service_account', id: accountId });
  expect(execution.stepExecutions?.find((step) => step.stepId === 'read')?.status).toBe(
    'completed'
  );
  const write = execution.stepExecutions?.find((step) => step.stepId === 'write');
  expect(write?.status).toBe('failed');
  expect(JSON.stringify(write?.error)).toContain('security_exception');
};
