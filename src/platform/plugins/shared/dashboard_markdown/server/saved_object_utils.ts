/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { MarkdownAttributes } from './markdown_saved_object';

export function getMarkdownMeta(
  savedObject: SavedObject<MarkdownAttributes> | SavedObjectsUpdateResponse<MarkdownAttributes>
) {
  return {
    error: savedObject.error,
    ...(savedObject.created_at && { created_at: savedObject.created_at }),
    ...(savedObject.created_by && { created_by: savedObject.created_by }),
    updated_at: savedObject.updated_at,
    updated_by: savedObject.updated_by,
    version: savedObject.version ?? '',
  };
}

// CRU is Create, Read, Update
export function getMarkdownCRUResponseBody(
  savedObject: SavedObject<MarkdownAttributes> | SavedObjectsUpdateResponse<MarkdownAttributes>
) {
  return {
    id: savedObject.id,
    data: savedObject.attributes as MarkdownAttributes,
    meta: getMarkdownMeta(savedObject),
  };
}
