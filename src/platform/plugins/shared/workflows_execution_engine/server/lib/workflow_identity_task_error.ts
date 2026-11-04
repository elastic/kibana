/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { isPermanentMintFailure } from '../service_account_execution';

const identityTaskErrors = new WeakSet<Error>();

/** Reports a finalized, permanent service account identity failure to Task Manager as a user error. */
export const toWorkflowIdentityTaskError = (error: unknown): unknown => {
  if (!(error instanceof Error) || !isPermanentMintFailure(error)) {
    return error;
  }
  identityTaskErrors.add(error);
  return createTaskRunError(error, TaskErrorSource.USER);
};

/** Whether `error` was reported to Task Manager by `toWorkflowIdentityTaskError`. */
export const isWorkflowIdentityTaskError = (error: unknown): boolean =>
  error instanceof Error && identityTaskErrors.has(error);
