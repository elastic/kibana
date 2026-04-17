/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { getSpaceDefaultNpreName } from '@kbn/cps-common';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

export { createProjectFetcher } from './project_fetcher';

/**
 * Resolves the default project routing for the current space.
 * Returns {@link PROJECT_ROUTING.ALL} when the expression doesn't exist (404).
 */
export const fetchDefaultProjectRouting = async (http: HttpSetup): Promise<string> => {
  const basePath = http.basePath.get();
  const { spaceId } = getSpaceIdFromPath(basePath, http.basePath.serverBasePath);
  const projectRoutingName = getSpaceDefaultNpreName(spaceId);

  try {
    return await http.get<string>(`/internal/cps/project_routing/${projectRoutingName}`);
  } catch (error) {
    if (error?.response?.status === 404) {
      return PROJECT_ROUTING.ALL;
    }
    throw error;
  }
};
