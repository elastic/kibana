/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsSerializer, SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { IDocumentMigrator } from '@kbn/core-saved-objects-base-server-internal';
import { TransformRawDocs } from '../../types';
import { migrateRawDocsSafely } from '../../core/migrate_raw_docs';

export interface CreateDocumentTransformFnOpts {
  serializer: ISavedObjectsSerializer;
  documentMigrator: IDocumentMigrator;
}

export const createDocumentTransformFn = ({
  documentMigrator,
  serializer,
}: CreateDocumentTransformFnOpts): TransformRawDocs => {
  return (documents: SavedObjectsRawDoc[]) =>
    migrateRawDocsSafely({
      rawDocs: documents,
      migrateDoc: documentMigrator.migrateAndConvert,
      serializer,
    });
};
