/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { CreateWorkflowRequestSchema, WorkflowSchema } from '@kbn/workflows';
import { WorkflowsManagementApi, type GetWorkflowsParams } from './workflows_management_api';

export function defineRoutes(router: IRouter, api: WorkflowsManagementApi) {
  router.get(
    {
      path: '/api/workflows/{id}',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        return response.ok({
          body: await api.getWorkflow(id),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.post(
    {
      path: '/api/workflows/search',
      validate: false,
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
    },
    async (context, request, response) => {
      try {
        const { limit, offset } = request.query as GetWorkflowsParams;
        return response.ok({
          body: await api.getWorkflows({
            limit,
            offset,
          }),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.post(
    {
      path: '/api/workflows',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        body: CreateWorkflowRequestSchema,
      },
    },
    async (context, request, response) => {
      try {
        const createdWorkflow = await api.createWorkflow(request.body);
        return response.ok({
          body: createdWorkflow,
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.put(
    {
      path: '/api/workflows/{id}',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: WorkflowSchema.partial(),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        return response.ok({
          body: await api.updateWorkflow(id, request.body),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.delete(
    {
      path: '/api/workflows/{id}',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        return response.ok({
          body: await api.deleteWorkflows([id]),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.delete(
    {
      path: '/api/workflows',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { ids } = request.body as { ids: string[] };
        return response.ok({
          body: await api.deleteWorkflows(ids),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.post(
    {
      path: '/api/workflows/{id}/run',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const workflow = await api.getWorkflow(id);
        if (!workflow) {
          return response.notFound();
        }
        const { inputs } = request.body as { inputs: Record<string, any> };
        const workflowRunId = await api.runWorkflow(workflow, inputs);
        return response.ok({
          body: workflowRunId,
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.get(
    {
      path: '/api/workflowExecutions',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        query: schema.object({
          workflowId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowId } = request.query as { workflowId: string };
        return response.ok({
          body: await api.getWorkflowExecutions(workflowId),
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
  router.get(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const workflowExecution = await api.getWorkflowExecution(workflowExecutionId);
        return response.ok({
          body: workflowExecution,
        });
      } catch (error) {
        console.error(error);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
}
