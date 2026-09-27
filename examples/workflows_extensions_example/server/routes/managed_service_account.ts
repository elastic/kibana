/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsRequestHandlerContext } from '@kbn/workflows-extensions/server';
import { EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID } from '../managed_workflows';

export const registerManagedServiceAccountRoutes = (
  router: IRouter<WorkflowsExtensionsRequestHandlerContext>,
  getSpaceId: (request: KibanaRequest) => string
): void => {
  const path = '/internal/workflows_extensions_example/managed_service_account/{id}';
  const params = schema.object({ id: schema.string({ minLength: 1, maxLength: 256 }) });
  const options = (request: KibanaRequest<{ id: string }>) => ({
    spaceId: getSpaceId(request),
    workflowIdSuffix: request.params.id,
  });

  router.post(
    {
      path,
      options: { access: 'internal' },
      security: {
        authz: {
          requiredPrivileges: [
            ...WorkflowsManagementOperationPrivileges.create,
            ...WorkflowsManagementOperationPrivileges.updateManaged,
          ],
        },
      },
      validate: {
        params,
        body: schema.object({ serviceAccountId: schema.string({ minLength: 1, maxLength: 256 }) }),
      },
    },
    async (context, request, response) => {
      try {
        const workflows = await context.workflows;
        await workflows.managedWorkflows.install(
          EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
          EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
          {
            ...options(request),
            values: { serviceAccountId: request.body.serviceAccountId },
          }
        );
        return response.ok({
          body: { workflowId: `${EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID}-${request.params.id}` },
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          return response.customError({
            statusCode: error.output.statusCode,
            body: { message: error.message },
          });
        }
        throw error;
      }
    }
  );

  router.post(
    {
      path: `${path}/run`,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute] },
      },
      validate: { params, body: schema.object({}) },
    },
    async (context, request, response) => {
      try {
        const workflows = await context.workflows;
        const workflowExecutionId = await workflows.managedWorkflows.execute(
          EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
          EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
          options(request)
        );
        return response.ok({ body: { workflowExecutionId } });
      } catch (error) {
        if (Boom.isBoom(error)) {
          return response.customError({
            statusCode: error.output.statusCode,
            body: { message: error.message },
          });
        }
        throw error;
      }
    }
  );

  router.delete(
    {
      path,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.delete] },
      },
      validate: { params },
    },
    async (context, request, response) => {
      try {
        const workflows = await context.workflows;
        await workflows.managedWorkflows.uninstall(
          EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
          EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
          options(request)
        );
        return response.noContent();
      } catch (error) {
        if (Boom.isBoom(error)) {
          return response.customError({
            statusCode: error.output.statusCode,
            body: { message: error.message },
          });
        }
        throw error;
      }
    }
  );
};
