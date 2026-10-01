/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { handleRouteError } from '../utils/route_error_handlers';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerChildWorkflowApprovalRoutes = ({
  router,
  workflowsService,
  spaces,
  audit,
}: RouteDependencies): void => {
  const readPrivileges = [
    ...WorkflowsManagementOperationPrivileges.read,
    ...WorkflowsManagementOperationPrivileges.execute,
  ];
  router.get(
    {
      path: '/internal/workflows/{id}/child_approvals',
      security: {
        authz: {
          requiredPrivileges: readPrivileges,
          extendedPrivileges: [
            WorkflowsManagementApiActions.readManaged,
            WorkflowsManagementApiActions.update,
          ],
        },
      },
      validate: { params: idParamSchema },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const service = await workflowsService.getChildWorkflowApprovalService();
        return response.ok({
          body: await service.review(request.params.id, spaces.getSpaceId(request), request),
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
  router.post(
    {
      path: '/internal/workflows/{id}/child_approvals',
      security: {
        authz: {
          requiredPrivileges: [...readPrivileges, ...WorkflowsManagementOperationPrivileges.update],
          extendedPrivileges: [WorkflowsManagementApiActions.readManaged],
        },
      },
      validate: {
        params: idParamSchema,
        body: schema.object({ reviewToken: schema.string({ minLength: 64, maxLength: 64 }) }),
      },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const service = await workflowsService.getChildWorkflowApprovalService();
        await service.approve(
          request.params.id,
          spaces.getSpaceId(request),
          request,
          request.body.reviewToken
        );
        audit.logWorkflowUpdated(request, { id: request.params.id });
        return response.ok({ body: { approved: true } });
      } catch (error) {
        audit.logWorkflowUpdated(request, { id: request.params.id, error });
        return handleRouteError(response, error);
      }
    })
  );
};
