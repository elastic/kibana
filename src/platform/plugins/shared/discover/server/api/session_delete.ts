/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';

export const deleteDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<{ id: string; data: { title: string; tags: string[] } }> => {
  const { core } = await requestContext.resolve(['core']);
  const savedObject = await core.savedObjects.client.get<DiscoverSessionAttributes>(
    SavedSearchType,
    id
  );
  const { tags } = toAsCodeTags(savedObject.references);
  await core.savedObjects.client.delete(SavedSearchType, id);

  return {
    id: savedObject.id,
    data: {
      title: savedObject.attributes.title,
      tags,
    },
  };
};
