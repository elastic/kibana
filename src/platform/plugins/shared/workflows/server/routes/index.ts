import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { WorkflowsManagementApi, type GetWorkflowsParams } from '../api';

export function defineRoutes(router: IRouter) {
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
          body: await WorkflowsManagementApi.getWorkflows({
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
          body: await WorkflowsManagementApi.getWorkflow(id),
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
