/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { WorkflowValidationError } from '@kbn/workflows-yaml';
import { handleRouteError } from './route_error_handlers';
import {
  WORKFLOW_CHANGE_HISTORY_UNAVAILABLE_MESSAGE,
  WorkflowChangeHistoryDisabledError,
} from '../../../lib/workflow_change_history_disabled_error';
import {
  WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE,
  WorkflowHistoryPaginationError,
} from '../../../lib/workflow_history_pagination_error';
import { ManagedWorkflowDeleteForbiddenError } from '../../managed_workflow_delete_error';
import { ManagedWorkflowUpdateForbiddenError } from '../../managed_workflow_errors';

describe('handleRouteError', () => {
  it('returns forbidden for managed workflow update policy errors', () => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(response, new ManagedWorkflowUpdateForbiddenError());

    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message: 'Managed workflows cannot be edited. You can only enable or disable them.',
      },
    });
  });

  it('returns forbidden for managed workflow delete policy errors', () => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(response, new ManagedWorkflowDeleteForbiddenError());

    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message: 'Managed workflows cannot be deleted.',
      },
    });
  });

  it('returns bad request with HISTORY_DISABLED code when change history is not initialized', () => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(response, new WorkflowChangeHistoryDisabledError());

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: WORKFLOW_CHANGE_HISTORY_UNAVAILABLE_MESSAGE,
        attributes: {
          code: 'HISTORY_DISABLED',
        },
      },
    });
  });

  it('returns bad request when workflow history pagination exceeds the result window', () => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(response, new WorkflowHistoryPaginationError());

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE,
      },
    });
  });

  it('returns bad request carrying validation reasons under attributes', () => {
    const response = httpServerMock.createResponseFactory();
    const validationErrors = [
      'Parallel step "outer" has a branch body containing unsupported flow-control ("enter-parallel").',
      'Parallel step "fan_out" requires at least 2 branches.',
    ];

    handleRouteError(
      response,
      new WorkflowValidationError('Workflow validation failed', validationErrors)
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Workflow validation failed',
        attributes: { validationErrors },
      },
    });
  });

  it('omits attributes when the validation error carries no reasons', () => {
    const response = httpServerMock.createResponseFactory();

    handleRouteError(response, new WorkflowValidationError('Workflow validation failed'));

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Workflow validation failed' },
    });
  });
});
