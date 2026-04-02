/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { MarkdownAttributes } from '../markdown_saved_object';

// CRU is Create, Read, Update
export function getMarkdownCRUResponseBody(
  savedObject: SavedObject<MarkdownAttributes> | SavedObjectsUpdateResponse<MarkdownAttributes>
) {
  return {
    id: savedObject.id,
    data: savedObject.attributes as MarkdownAttributes,
    meta: getMeta(savedObject),
  };
}
