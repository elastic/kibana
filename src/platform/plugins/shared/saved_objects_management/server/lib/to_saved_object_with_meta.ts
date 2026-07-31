/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectErrorResult } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { SavedObjectWithMetadata } from '../../common/types/v1';

export function toSavedObjectWithMeta(
  so: SavedObject | SavedObjectErrorResult
): SavedObjectWithMetadata {
  if (isSavedObjectErrorResult(so)) {
    return {
      id: so.id,
      type: so.type,
      error: so.error,
      meta: {},
    } as SavedObjectWithMetadata;
  }
  return {
    id: so.id,
    type: so.type,
    namespaces: so.namespaces,
    references: so.references,
    updated_at: so.updated_at,
    managed: so.managed,
    attributes: so.attributes,
    created_at: so.created_at,
    meta: {},
  };
}
