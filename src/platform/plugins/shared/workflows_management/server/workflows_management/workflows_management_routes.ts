/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { CreateWorkflowCommandSchema } from '@kbn/workflows';
import type { WorkflowsManagementApi } from './workflows_management_api';
import { type GetWorkflowsParams } from './workflows_management_api';

export function defineRoutes(router: IRouter, api: WorkflowsManagementApi, logger: Logger) {
  router.get(
    {
      path: '/api/workflows/{id}',
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_read'],
            },
          ],
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
        const workflow = await api.getWorkflow(id);
        if (!workflow) {
          return response.notFound({
            body: {
              message: `Workflow not found`,
            },
          });
        }
        return response.ok({ body: workflow });
      } catch (error) {
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_read'],
            },
          ],
        },
      },
      validate: false,
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_create'],
            },
          ],
        },
      },
      validate: {
        body: CreateWorkflowCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const createdWorkflow = await api.createWorkflow(request.body, request);
        return response.ok({ body: createdWorkflow });
      } catch (error) {
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_update'],
            },
          ],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: CreateWorkflowCommandSchema.partial(),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        return response.ok({
          body: await api.updateWorkflow(id, request.body, request),
        });
      } catch (error) {
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

      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_delete'],
            },
          ],
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
        await api.deleteWorkflows([id], request);
        return response.ok();
      } catch (error) {
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_delete'],
            },
          ],
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
        await api.deleteWorkflows(ids, request);
        return response.ok();
      } catch (error) {
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_execute', 'workflow_execution_create'],
            },
          ],
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
      path: '/api/workflows/test',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any()),
          workflowYaml: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const workflowExecutionId = await api.testWorkflow(
          request.body.workflowYaml,
          request.body.inputs
        );

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_execution_read'],
            },
          ],
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
      options: {
        tags: ['access:workflowsManagement'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_execution_read'],
            },
          ],
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
        if (!workflowExecution) {
          return response.notFound();
        }
        return response.ok({
          body: workflowExecution,
        });
      } catch (error) {
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
      path: '/api/workflowExecutions/{workflowExecutionId}/logs',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
        query: schema.object({
          limit: schema.maybe(schema.number({ min: 1, max: 1000 })),
          offset: schema.maybe(schema.number({ min: 0 })),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const { limit, offset, sortField, sortOrder } = request.query;

        const logs = await api.getWorkflowExecutionLogs({
          executionId: workflowExecutionId,
          limit,
          offset,
          sortField,
          sortOrder,
        });

        return response.ok({
          body: logs,
        });
      } catch (error) {
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
