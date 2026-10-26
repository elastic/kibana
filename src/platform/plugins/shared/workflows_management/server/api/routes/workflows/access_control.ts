/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { workflowAccessControlSchema, WorkflowsManagementApiActions } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  assertCanReadManagedWorkflow,
  hasWorkflowReadPrivilege,
  WORKFLOW_READ_WITH_MANAGED_SECURITY,
  WORKFLOW_UPDATE_SECURITY,
} from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerWorkflowAccessControlRoutes = ({
  router,
  api,
  workflowsService,
  spaces,
  audit,
}: RouteDependencies): void => {
  router.put(
    {
      path: '/internal/workflows/{id}/access_control',
      security: WORKFLOW_UPDATE_SECURITY,
      validate: { params: idParamSchema, body: workflowAccessControlSchema },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const result = await api.updateAccessControl(
          request.params.id,
          spaces.getSpaceId(request),
          request.body,
          request
        );
        audit.logWorkflowUpdated(request, { id: request.params.id });
        return response.ok({ body: result });
      } catch (error) {
        audit.logWorkflowUpdated(request, { id: request.params.id, error });
        return handleRouteError(response, error);
      }
    })
  );

  router.get(
    {
      path: '/internal/workflows/{id}/access_control/_profiles',
      security: WORKFLOW_READ_WITH_MANAGED_SECURITY,
      validate: { params: idParamSchema },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        if (!hasWorkflowReadPrivilege(request)) {
          return response.forbidden();
        }
        // `getWorkflow` only exposes the owner and entries to callers who can manage the workflow.
        const workflow = await api.getWorkflow(
          request.params.id,
          spaces.getSpaceId(request),
          request
        );
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found' } });
        }
        assertCanReadManagedWorkflow(request, workflow);
        const uids = new Set(
          [
            workflow.owner_id,
            ...(workflow.access_control?.entries ?? []).map(({ id }) => id),
          ].filter((id): id is string => Boolean(id))
        );
        if (uids.size === 0) return response.ok({ body: [] });
        const { userProfile } = await workflowsService.getCoreStart();
        const profiles = await userProfile.bulkGet({ uids, dataPath: 'avatar' });
        return response.ok({ body: profiles });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );

  router.post(
    {
      path: '/internal/workflows/{id}/_suggest_user_profiles',
      security: WORKFLOW_UPDATE_SECURITY,
      validate: {
        params: idParamSchema,
        body: schema.object({
          name: schema.string({ maxLength: 1024 }),
          size: schema.number({ min: 1, max: 100, defaultValue: 20 }),
          dataPath: schema.maybe(schema.string({ maxLength: 1024 })),
        }),
      },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        await api.assertWorkflowAccess(
          request.params.id,
          spaces.getSpaceId(request),
          'manage',
          request,
          { auditOverride: false }
        );
        const { userProfile } = await workflowsService.getCoreStart();
        const { security } = await workflowsService.getPluginsStart();
        if (!security) return response.ok({ body: [] });
        const profiles = await userProfile.suggest({
          ...request.body,
          requiredPrivileges: {
            spaceId: spaces.getSpaceId(request),
            privileges: {
              kibana: [security.authz.actions.api.get(WorkflowsManagementApiActions.read)],
            },
          },
        });
        return response.ok({ body: profiles });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
};
