/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectModelUnsafeTransformFn,
  SavedObjectMigrationFn,
} from '@kbn/core-saved-objects-server';

export const unsafeTransformToLegacyMigration = (
  unsafeTransformFn: SavedObjectModelUnsafeTransformFn<any, any>,
  modelVersionNumber: number = 1
): SavedObjectMigrationFn<any, any> => {
  return (doc, context) => {
    const { document: outputDoc } = unsafeTransformFn(doc, {
      log: context.log,
      modelVersion: modelVersionNumber,
      namespaceType: context.isSingleNamespaceType ? 'single' : 'multiple',
    });
    return outputDoc;
  };
};

export const legacyMigrationToUnsafeTransform = (
  legacyMigration: SavedObjectMigrationFn<any, any>,
  migrationVersion: string = '8.10.0'
): SavedObjectModelUnsafeTransformFn<any, any> => {
  return (doc, context) => {
    const document = legacyMigration(doc, {
      log: context.log,
      isSingleNamespaceType: context.namespaceType === 'single',
      migrationVersion,
    });
    return { document };
  };
};
