/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry, SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { DashboardState } from './types';

type DashboardAccessMode = NonNullable<
  NonNullable<DashboardState['access_control']>['access_mode']
>;

export async function createDashboardSavedObject({
  savedObjectsClient,
  typeRegistry,
  id,
  attributes,
  references,
  accessMode,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  id?: string;
  attributes: DashboardSavedObjectAttributes;
  references: SavedObjectReference[];
  accessMode?: DashboardAccessMode;
}): Promise<SavedObject<DashboardSavedObjectAttributes>> {
  const supportsAccessControl = typeRegistry.supportsAccessControl(DASHBOARD_SAVED_OBJECT_TYPE);
  return await savedObjectsClient.create<DashboardSavedObjectAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    attributes,
    {
      ...(id && { id }),
      references,
      ...(accessMode &&
        supportsAccessControl && {
          accessControl: {
            accessMode,
          },
        }),
    }
  );
}
