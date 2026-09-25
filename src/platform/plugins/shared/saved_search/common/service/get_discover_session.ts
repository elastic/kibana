/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSession } from '../types';
import { deserializeDiscoverSession } from './discover_session_serialization';
import type { GetSavedSearchDependencies } from './get_saved_searches';
import { getSearchSavedObject } from './get_saved_searches';

export const getDiscoverSession = async (
  discoverSessionId: string,
  deps: GetSavedSearchDependencies
): Promise<DiscoverSession> => {
  const so = await getSearchSavedObject(discoverSessionId, deps);
  const discoverSession: DiscoverSession = {
    ...deserializeDiscoverSession({
      id: so.item.id,
      attributes: so.item.attributes,
      references: so.item.references,
      managed: so.item.managed,
      sharingSavedObjectProps: so.meta,
    }),
    tags: deps.savedObjectsTagging
      ? deps.savedObjectsTagging.ui.getTagIdsFromReferences(so.item.references)
      : undefined,
  };

  return discoverSession;
};
