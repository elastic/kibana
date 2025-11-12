/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { DashboardState } from '../content_management';
import { transformDashboardOut, transformReferencesOut } from '../content_management/v1/transforms';
import type { DashboardCRUResponseBody } from './types';

export function getDashboardMeta(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>
): DashboardCRUResponseBody['meta'] {
  return {
    createdAt: savedObject.created_at,
    createdBy: savedObject.created_by,
    error: savedObject.error,
    managed: savedObject.managed,
    updatedAt: savedObject.updated_at,
    updatedBy: savedObject.updated_by,
    version: savedObject.version ?? '',
  };
}

export function getDashboardCRUResponseBody(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>
): DashboardCRUResponseBody {
  let dashboardState: DashboardState;
  let references: Reference[];
  try {
    dashboardState = transformDashboardOut(
      savedObject.attributes,
      savedObject.references
    ) as DashboardState;
    references = transformReferencesOut(savedObject.references ?? [], dashboardState.panels);
  } catch (transformOutError) {
    throw Boom.badRequest(`Invalid response. ${transformOutError.message}`);
  }

  return {
    id: savedObject.id,
    data: {
      ...dashboardState,
      references,
    },
    meta: getDashboardMeta(savedObject),
    spaces: savedObject.namespaces,
  };
}
