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
  savedObject: SavedObject<MarkdownAttributes> | SavedObjectsUpdateResponse<MarkdownAttributes>,
  operation: 'create' | 'read' | 'update' | 'search'
) {
  return {
    error: savedObject.error,
    updated_at: savedObject.updated_at,
    updated_by: savedObject.updated_by,
    version: savedObject.version ?? '',
    ...(['create', 'read', 'search'].includes(operation) && {
      created_at: savedObject.created_at,
      created_by: savedObject.created_by,
    }),
  };
}

// CRU is Create, Read, Update
export function getMarkdownCRUResponseBody(
  savedObject: SavedObject<MarkdownAttributes> | SavedObjectsUpdateResponse<MarkdownAttributes>,
  operation: 'create' | 'read' | 'update' | 'search'
) {
  return {
    id: savedObject.id,
    data: savedObject.attributes as MarkdownAttributes,
    meta: getMarkdownMeta(savedObject, operation),
    spaces: savedObject.namespaces,
  };
}
