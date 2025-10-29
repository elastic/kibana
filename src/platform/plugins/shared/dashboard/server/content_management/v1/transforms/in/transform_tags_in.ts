/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { tagSavedObjectTypeName } from '@kbn/saved-objects-tagging-plugin/common';
import type { DashboardAttributes } from '../../types';

export function transformTagsIn({
  tags,
  references,
}: {
  tags: DashboardAttributes['tags'];
  references?: SavedObjectReference[];
}) {
  const uniqueTagIds = new Set<string>([]);
  (references ?? []).forEach(({ type, id }) => {
    if (type === tagSavedObjectTypeName) uniqueTagIds.add(id);
  });
  (tags ?? []).forEach((tagId) => {
    uniqueTagIds.add(tagId);
  });

  return Array.from(uniqueTagIds).map((tagId) => ({
    type: tagSavedObjectTypeName,
    id: tagId,
    name: `tag-ref-${tagId}`,
  }));
}
