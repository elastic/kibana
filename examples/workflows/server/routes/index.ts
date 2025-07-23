import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { WorkflowsExamplePluginStartDeps } from '../types';

export function defineRoutes(
  core: CoreSetup<WorkflowsExamplePluginStartDeps, WorkflowsExamplePluginStartDeps>
) {
  async function getWorkflowManager() {
    const services = await core.getStartServices();
    return services[1].workflowsManagement;
  }

  const router = core.http.createRouter();

  router.post(
    {
      path: '/api/workflows/run',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: {
        query: schema.object({
          useDefaultCapabilities: schema.boolean({ defaultValue: false }),
        }),
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      try {
        const { workflow, inputs } = request.body;
        const workflowsManagement = await getWorkflowManager();

        const workflowExecutionId = await workflowsManagement.runWorkflow(workflow, inputs);

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error occured: ${error.message}`,
          },
        });
      }
    }
  );
}
