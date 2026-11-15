/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqBy } from 'lodash';
import type { ISavedObjectTypeRegistry, SavedObjectReference } from '@kbn/core/server';
import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';

/** The display name a saved object type is listed under, else the type itself. */
export const getTypeDisplayName =
  (typeRegistry: Pick<ISavedObjectTypeRegistry, 'getType'>) =>
  (type: string): string =>
    typeRegistry.getType(type)?.management?.displayName ?? type;

/** Each saved object the references point at, once. */
export const toRelatedItems = (
  references: readonly SavedObjectReference[],
  typeDisplayName: (type: string) => string
): AsCodeRelatedItem[] =>
  uniqBy(references, ({ type, id }) => `${type}:${id}`).map(({ type, id }) => ({
    type,
    type_label: typeDisplayName(type),
    id,
  }));
