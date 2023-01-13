/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
import type { BulkGetHTTPBodyV1, SavedObjectWithMetadataV2 } from '../../../common';
import type { ISavedObjectsManagement } from '../../services';
import { injectMetaAttributes } from '../../lib';

// This is "service" level code that actually handles our business logic.
export async function bulkGet({
  objects,
  managementService,
  ctx,
}: {
  objects: BulkGetHTTPBodyV1;
  managementService: ISavedObjectsManagement;
  ctx: SavedObjectsRequestHandlerContext;
}): Promise<SavedObjectWithMetadataV2[]> {
  const uniqueTypes = objects.reduce((acc, { type }) => acc.add(type), new Set<string>());
  const includedHiddenTypes = Array.from(uniqueTypes).filter(
    (type) => ctx.typeRegistry.isHidden(type) && ctx.typeRegistry.isImportableAndExportable(type)
  );

  const client = ctx.getClient({ includedHiddenTypes });
  const response = await client.bulkGet<unknown>(objects);
  const enhancedObjects = response.saved_objects.map((obj) => {
    if (!obj.error) {
      return injectMetaAttributes(obj, managementService);
    }
    return obj;
  });

  return enhancedObjects.map((obj) => ({
    ...obj,
    meta: { ...(obj as any).meta, isManaged: true },
  }));
}
