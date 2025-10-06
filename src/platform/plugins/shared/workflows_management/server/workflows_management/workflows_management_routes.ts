/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Type, schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ExecutionStatus, ExecutionType, WorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  CreateWorkflowCommandSchema,
  ExecutionStatusValues,
  ExecutionTypeValues,
  SearchWorkflowCommandSchema,
  UpdateWorkflowCommandSchema,
} from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  isWorkflowValidationError,
} from '../../common/lib/errors';
import type { WorkflowsManagementApi } from './workflows_management_api';
import { type GetWorkflowsParams } from './workflows_management_api';
import type { SearchWorkflowExecutionsParams } from './workflows_management_service';

export function defineRoutes(
  router: IRouter,
  api: WorkflowsManagementApi,
  logger: Logger,
  spaces: SpacesServiceStart
) {
  router.get(
    {
      path: '/api/workflows/stats',
      options: {
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        const stats = await api.getWorkflowStats(spaceId);

        return response.ok({ body: stats || {} });
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
      path: '/api/workflows/aggs',
      options: {
        tags: ['api', 'workflows'],
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
      validate: { query: schema.object({ fields: schema.arrayOf(schema.string()) }) },
    },
    async (context, request, response) => {
      try {
        const { fields } = request.query as { fields: string[] };
        const spaceId = spaces.getSpaceId(request);
        const aggs = await api.getWorkflowAggs(fields, spaceId);

        return response.ok({ body: aggs || {} });
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
      path: '/api/workflows/{id}',
      options: {
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        const workflow = await api.getWorkflow(id, spaceId);
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
        tags: ['api', 'workflows'],
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
        body: SearchWorkflowCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const { limit, page, enabled, createdBy, query } =
          request.body as unknown as GetWorkflowsParams;

        const spaceId = spaces.getSpaceId(request);
        return response.ok({
          body: await api.getWorkflows(
            {
              limit,
              page,
              enabled,
              createdBy,
              query,
            },
            spaceId
          ),
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
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        const createdWorkflow = await api.createWorkflow(request.body, spaceId, request);
        return response.ok({ body: createdWorkflow });
      } catch (error) {
        if (isWorkflowValidationError(error)) {
          return response.badRequest({
            body: error.toJSON(),
          });
        }
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
        tags: ['api', 'workflows'],
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
        body: UpdateWorkflowCommandSchema.partial(),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const spaceId = spaces.getSpaceId(request);
        const updated = await api.updateWorkflow(id, request.body, spaceId, request);
        if (updated === null) {
          return response.notFound();
        }
        return response.ok({
          body: updated,
        });
      } catch (error) {
        if (isWorkflowValidationError(error)) {
          return response.badRequest({
            body: error.toJSON(),
          });
        }
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
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        await api.deleteWorkflows([id], spaceId, request);
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
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        await api.deleteWorkflows(ids, spaceId, request);
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
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        const workflow = await api.getWorkflow(id, spaceId);
        if (!workflow) {
          return response.notFound();
        }
        if (!workflow.valid) {
          return response.badRequest({
            body: {
              message: `Workflow is not valid.`,
            },
          });
        }
        if (!workflow.definition) {
          return response.customError({
            statusCode: 500,
            body: {
              message: `Workflow definition is missing.`,
            },
          });
        }
        if (!workflow.enabled) {
          return response.badRequest({
            body: {
              message: `Workflow is disabled. Enable it to run it.`,
            },
          });
        }
        const { inputs } = request.body as { inputs: Record<string, any> };
        const workflowForExecution: WorkflowExecutionEngineModel = {
          id: workflow.id,
          name: workflow.name,
          enabled: workflow.enabled,
          definition: workflow.definition,
          yaml: workflow.yaml,
        };
        const workflowExecutionId = await api.runWorkflow(
          workflowForExecution,
          spaceId,
          inputs,
          request
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
  router.post(
    {
      path: '/api/workflows/{id}/clone',
      options: {
        tags: ['api', 'workflows'],
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
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const spaceId = spaces.getSpaceId(request);
        const workflow = await api.getWorkflow(id, spaceId);
        if (!workflow) {
          return response.notFound();
        }
        const createdWorkflow = await api.cloneWorkflow(workflow, spaceId, request);
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
  router.post(
    {
      path: '/api/workflows/test',
      options: {
        tags: ['api', 'workflows'],
      },
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
        const spaceId = spaces.getSpaceId(request);

        const workflowExecutionId = await api.testWorkflow(
          request.body.workflowYaml,
          request.body.inputs,
          spaceId,
          request
        );

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        if (error instanceof InvalidYamlSyntaxError || error instanceof InvalidYamlSchemaError) {
          return response.badRequest({
            body: {
              message: `Invalid workflow yaml: ${error.message}`,
            },
          });
        }
        if (isWorkflowValidationError(error)) {
          return response.badRequest({
            body: error.toJSON(),
          });
        }
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
      path: '/api/workflows/testStep',
      options: {
        tags: ['api', 'workflows'],
      },
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        body: schema.object({
          stepId: schema.string(),
          contextOverride: schema.recordOf(schema.string(), schema.any()),
          workflowYaml: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        const workflowExecutionId = await api.testStep(
          request.body.workflowYaml,
          request.body.stepId,
          request.body.contextOverride,
          spaceId
        );

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        if (error instanceof InvalidYamlSyntaxError || error instanceof InvalidYamlSchemaError) {
          return response.badRequest({
            body: {
              message: `Invalid workflow yaml: ${error.message}`,
            },
          });
        }
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
        tags: ['api', 'workflows'],
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
        // todo use shared params schema based on SearchWorkflowExecutionsParams type
        query: schema.object({
          workflowId: schema.string(),
          statuses: schema.maybe(
            schema.oneOf(
              [
                schema.oneOf(
                  ExecutionStatusValues.map((type) => schema.literal(type)) as [
                    Type<ExecutionStatus>
                  ]
                ),
                schema.arrayOf(
                  schema.oneOf(
                    ExecutionStatusValues.map((type) => schema.literal(type)) as [
                      Type<ExecutionStatus>
                    ]
                  )
                ),
              ],
              {
                defaultValue: [],
              }
            )
          ),
          executionTypes: schema.maybe(
            schema.oneOf(
              [
                schema.oneOf(
                  ExecutionTypeValues.map((type) => schema.literal(type)) as [Type<ExecutionType>]
                ),
                schema.arrayOf(
                  schema.oneOf(
                    ExecutionTypeValues.map((type) => schema.literal(type)) as [Type<ExecutionType>]
                  )
                ),
              ],
              {
                defaultValue: [],
              }
            )
          ),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const params: SearchWorkflowExecutionsParams = {
          workflowId: request.query.workflowId,
          statuses:
            request.query.statuses && typeof request.query.statuses === 'string'
              ? [request.query.statuses]
              : request.query.statuses,
          // Execution type filter is not supported yet
          // executionTypes: parseExecutionTypes(request.query.executionTypes),
        };
        return response.ok({
          body: await api.getWorkflowExecutions(params, spaceId),
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
        tags: ['api', 'workflows'],
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
        const spaceId = spaces.getSpaceId(request);
        const workflowExecution = await api.getWorkflowExecution(workflowExecutionId, spaceId);
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

  router.post(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}/cancel',
      options: {
        tags: ['api', 'workflows'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_execution_cancel'],
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
        const spaceId = spaces.getSpaceId(request);

        await api.cancelWorkflowExecution(workflowExecutionId, spaceId);
        return response.ok();
      } catch (error) {
        if (error instanceof WorkflowExecutionNotFoundError) {
          return response.notFound();
        }

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
      options: {
        tags: ['api', 'workflows'],
      },
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
          stepExecutionId: schema.maybe(schema.string()),
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
        const { limit, offset, sortField, sortOrder, stepExecutionId } = request.query;
        const spaceId = spaces.getSpaceId(request);

        const logs = await api.getWorkflowExecutionLogs(
          {
            executionId: workflowExecutionId,
            limit,
            offset,
            sortField,
            sortOrder,
            stepExecutionId,
          },
          spaceId
        );

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
  router.get(
    {
      path: '/api/workflowExecutions/{executionId}/steps/{id}',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        params: schema.object({
          executionId: schema.string(),
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { executionId, id } = request.params;
        const stepExecution = await api.getStepExecution(
          { executionId, id },
          spaces.getSpaceId(request)
        );
        if (!stepExecution) {
          return response.notFound();
        }
        return response.ok({
          body: stepExecution,
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
