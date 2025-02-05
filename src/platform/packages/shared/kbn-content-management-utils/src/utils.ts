/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';

export const tagsToFindOptions = ({
  included,
  excluded,
}: {
  included?: string[];
  excluded?: string[];
} = {}) => {
  const hasReference: SavedObjectsFindOptions['hasReference'] = included
    ? included.map((id) => ({
        id,
        type: 'tag',
      }))
    : undefined;

  const hasNoReference: SavedObjectsFindOptions['hasNoReference'] = excluded
    ? excluded.map((id) => ({
        id,
        type: 'tag',
      }))
    : undefined;
  return { hasReference, hasNoReference };
};
