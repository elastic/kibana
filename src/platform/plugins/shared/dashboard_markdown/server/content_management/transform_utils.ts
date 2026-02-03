/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { Reference, SOWithMetadata } from '@kbn/content-management-utils/src/types';
import type { StoredMarkdownState } from '..';

export type MarkdownItem = SOWithMetadata<StoredMarkdownState>;

export function savedObjectToItem(savedObject: SavedObject<StoredMarkdownState>) {
  const {
    attributes,
    references,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    ...rest
  } = savedObject;

  return {
    ...rest,
    ...attributes,
    updatedBy,
    updatedAt,
    createdAt,
    createdBy,
    attributes,
    references: references.filter(({ type }) => type === 'tag'),
  };
}

export function itemToAttributes(state: StoredMarkdownState): {
  attributes: StoredMarkdownState;
  references: Reference[];
} {
  return {
    attributes: state,
    references: [],
  };
}
