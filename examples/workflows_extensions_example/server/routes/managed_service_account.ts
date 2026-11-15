/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowConflictError } from '@kbn/workflows-yaml';
import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges, WorkflowRunAsModeSchema } from '@kbn/workflows';
import { EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsRequestHandlerContext } from '@kbn/workflows-extensions/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID } from '../managed_workflows';

export const registerManagedServiceAccountRoutes = (
  router: IRouter<WorkflowsExtensionsRequestHandlerContext>,
  getSpaceId: (request: KibanaRequest) => string
): void => {
  const path = '/internal/workflows_extensions_example/managed_service_account/{id}';
  const params = schema.object({ id: schema.string({ minLength: 1, maxLength: 256 }) });
  const [defaultMode, inheritMode, overrideMode] = WorkflowRunAsModeSchema.options;
  const options = (request: KibanaRequest<{ id: string }>, global = false) => ({
    spaceId: global ? GLOBAL_WORKFLOW_SPACE_ID : getSpaceId(request),
    workflowIdSuffix: request.params.id,
  });

  for (const global of [false, true]) {
    router.post(
      {
        path: global ? `${path}/global` : path,
        options: { access: 'internal' },
        security: {
          authz: {
            requiredPrivileges: global
              ? [ReservedPrivilegesSet.superuser]
              : [
                  ...WorkflowsManagementOperationPrivileges.create,
                  ...WorkflowsManagementOperationPrivileges.updateManaged,
                ],
          },
        },
        validate: {
          params,
          body: schema.object({
            serviceAccountId: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
            childWorkflowId: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
            runAsMode: schema.maybe(
              schema.oneOf([
                schema.literal(defaultMode),
                schema.literal(inheritMode),
                schema.literal(overrideMode),
              ])
            ),
            fallbackChild: schema.maybe(schema.boolean()),
            asynchronous: schema.maybe(schema.boolean()),
            waitForInput: schema.maybe(schema.boolean()),
            message: schema.maybe(schema.string({ maxLength: 1024 })),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const workflows = await context.workflows;
          await workflows.managedWorkflows.install(
            EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
            EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
            {
              ...options(request, global),
              values: {
                ...request.body,
                message: request.body.message ?? 'Managed identity example completed',
              },
            }
          );
          return response.ok({
            body: {
              workflowId: `${EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID}-${request.params.id}`,
            },
          });
        } catch (error) {
          if (error instanceof WorkflowConflictError) {
            return response.conflict({ body: { message: error.message } });
          }
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
        path: global ? `${path}/global` : path,
        options: { access: 'internal' },
        security: {
          authz: {
            requiredPrivileges: global
              ? [ReservedPrivilegesSet.superuser]
              : [...WorkflowsManagementOperationPrivileges.delete],
          },
        },
        validate: { params },
      },
      async (context, request, response) => {
        try {
          const workflows = await context.workflows;
          await workflows.managedWorkflows.uninstall(
            EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
            EXAMPLE_SERVICE_ACCOUNT_WORKFLOW_ID,
            options(request, global)
          );
          return response.noContent();
        } catch (error) {
          if (error instanceof WorkflowConflictError) {
            return response.conflict({ body: { message: error.message } });
          }
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
  }

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
        if (error instanceof WorkflowConflictError) {
          return response.conflict({ body: { message: error.message } });
        }
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
