/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import Boom from '@hapi/boom';
import type { SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardUpdateRequestBody, DashboardUpdateResponseBody } from './types';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../get_cru_response_body';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';

export async function update(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  id: string,
  updateBody: DashboardUpdateRequestBody,
  isDashboardAppRequest: boolean = false
): Promise<DashboardUpdateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const { access_control: accessControl, ...restOfBody } = updateBody;
  const { attributes: soAttributes, references: soReferences } = transformDashboardIn(
    restOfBody,
    isDashboardAppRequest
  );

  let isCreateRequest = false;
  let existingAccessMode: 'default' | 'write_restricted' | undefined;
  try {
    const resolved = await core.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      id
    );
    existingAccessMode = resolved.saved_object.accessControl?.accessMode;
  } catch (resolveError) {
    if (resolveError.isBoom && resolveError.output.statusCode === 404) {
      isCreateRequest = true;
    } else {
      throw resolveError;
    }
  }

  // Validate id at handler level for create requests
  if (isCreateRequest) {
    asCodeIdSchema.validate(id);
  }

  const supportsAccessControl = core.savedObjects.typeRegistry.supportsAccessControl(
    DASHBOARD_SAVED_OBJECT_TYPE
  );

  if (accessControl?.access_mode && !supportsAccessControl) {
    throw Boom.badRequest('Dashboard does not support access control.');
  }

  if (isCreateRequest) {
    try {
      const savedObject = await core.savedObjects.client.create<DashboardSavedObjectAttributes>(
        DASHBOARD_SAVED_OBJECT_TYPE,
        soAttributes,
        {
          id,
          references: soReferences,
          ...(accessControl?.access_mode &&
            supportsAccessControl && {
              accessControl: {
                accessMode: accessControl.access_mode ?? 'default',
              },
            }),
        }
      );

      const { saved_object: created } =
        await core.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
          DASHBOARD_SAVED_OBJECT_TYPE,
          savedObject.id
        );

      return getDashboardCRUResponseBody(
        created,
        'create',
        dashboardStateSchema,
        isDashboardAppRequest
      );
    } catch (e) {
      // If the document was created between the resolve check and the create call,
      // fall back to the update flow to preserve upsert semantics.
      if (e && typeof e === 'object' && 'isBoom' in e && (e as any).isBoom) {
        const statusCode = (e as any).output?.statusCode;
        if (statusCode !== 409) throw e;
      } else {
        throw e;
      }

      const resolved = await core.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
        DASHBOARD_SAVED_OBJECT_TYPE,
        id
      );
      existingAccessMode = resolved.saved_object.accessControl?.accessMode;
      isCreateRequest = false;
    }
  }

  const desiredAccessMode = accessControl?.access_mode;
  const currentAccessMode = existingAccessMode ?? 'default';
  const shouldChangeAccessMode =
    desiredAccessMode !== undefined && desiredAccessMode !== currentAccessMode;

  if (shouldChangeAccessMode) {
    try {
      const changeAccessModeResponse = await core.savedObjects.client.changeAccessMode(
        [{ type: DASHBOARD_SAVED_OBJECT_TYPE, id }],
        {
          accessMode: desiredAccessMode,
        }
      );

      const [result] = changeAccessModeResponse.objects;
      if (result?.error) {
        const message = result.error.message ?? 'Unable to change access mode.';
        if (result.error.statusCode === 403) throw Boom.forbidden(message);
        throw Boom.badRequest(message);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('currentUserProfile is undefined')) {
        throw Boom.badRequest(
          'Cannot change the dashboard access mode because Kibana could not determine the user profile ID for the caller. Access control requires an identifiable user profile.'
        );
      }
      throw e;
    }
  }

  let savedObject: SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>;
  try {
    savedObject = await core.savedObjects.client.update<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      id,
      soAttributes,
      {
        references: soReferences,
        /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
        mergeAttributes: false,
      }
    );
  } catch (e) {
    if (shouldChangeAccessMode) {
      try {
        await core.savedObjects.client.changeAccessMode(
          [{ type: DASHBOARD_SAVED_OBJECT_TYPE, id }],
          {
            accessMode: currentAccessMode,
          }
        );
      } catch {
        // best-effort rollback only
      }
    }
    throw e;
  }

  const { saved_object: updated } =
    await core.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      savedObject.id
    );

  return getDashboardCRUResponseBody(
    updated,
    'update',
    dashboardStateSchema,
    isDashboardAppRequest
  );
}
