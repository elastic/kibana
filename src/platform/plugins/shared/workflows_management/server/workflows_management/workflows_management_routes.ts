import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
import type { IRouter } from '@kbn/core/server';
import { WorkflowsManagementApi, type GetWorkflowsParams } from './workflows_management_api';
import { WorkflowSchema } from '@kbn/workflows';

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
      path: '/api/workflows',
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
}
