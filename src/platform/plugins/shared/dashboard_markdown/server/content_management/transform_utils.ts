/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { SOWithMetadata } from '@kbn/content-management-utils/src/types';
import type { MarkdownAttributes } from '../markdown_saved_object';

export type MarkdownItem = SOWithMetadata<MarkdownAttributes>;

export function savedObjectToItem(savedObject: SavedObject<MarkdownAttributes>) {
  const {
    attributes,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    ...rest
  } = savedObject;

  return {
    ...rest,
    updatedBy,
    updatedAt,
    createdAt,
    createdBy,
    attributes,
  };
}
