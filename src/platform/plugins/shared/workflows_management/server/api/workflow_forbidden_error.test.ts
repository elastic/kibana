/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { ManagedWorkflowDeleteForbiddenError } from './managed_workflow_delete_error';
import { ManagedWorkflowUpdateForbiddenError } from './managed_workflow_errors';
import { ManagedWorkflowExecutionReadForbiddenError } from './managed_workflow_execution_read_error';
import { ManagedWorkflowReadForbiddenError } from './managed_workflow_read_error';
import { WorkflowForbiddenError } from './workflow_forbidden_error';
import { WorkflowRequiresDelegatedIdentityError } from './workflow_requires_delegated_identity_error';
import { WorkflowAccessDeniedError } from '../services/workflow_access_denied_error';

/**
 * Consumers outside this plugin classify these errors by duck-typing, not by
 * `instanceof`: the Cases route wrapper reads `statusCode` (`isHTTPError`) to
 * pick the HTTP status, and the workflows connector reads `isUserError` to
 * classify the task error source. If these fields disappear, Cases answers a
 * forbidden run with a 500 and the connector reports a user mistake as a
 * platform failure.
 */
describe('WorkflowForbiddenError HTTP contract', () => {
  const subclasses = [
    ['WorkflowRequiresDelegatedIdentityError', WorkflowRequiresDelegatedIdentityError],
    ['WorkflowAccessDeniedError', WorkflowAccessDeniedError],
    ['ManagedWorkflowReadForbiddenError', ManagedWorkflowReadForbiddenError],
    ['ManagedWorkflowUpdateForbiddenError', ManagedWorkflowUpdateForbiddenError],
    ['ManagedWorkflowDeleteForbiddenError', ManagedWorkflowDeleteForbiddenError],
    ['ManagedWorkflowExecutionReadForbiddenError', ManagedWorkflowExecutionReadForbiddenError],
  ] as const;

  it.each(subclasses)('%s carries statusCode 403 and isUserError', (name, Ctor) => {
    void name;
    const error = new Ctor('forbidden');
    expect(error).toBeInstanceOf(WorkflowForbiddenError);
    expect(error.statusCode).toBe(403);
    expect(error.isUserError).toBe(true);
  });
});
