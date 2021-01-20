/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DashboardSavedObject } from '../..';
import { SavedObjectsClientContract } from '../../../../../core/public';

export async function attemptLoadDashboardByTitle(
  title: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ id: string } | undefined> {
  const results = await savedObjectsClient.find<DashboardSavedObject>({
    search: `"${title}"`,
    searchFields: ['title'],
    type: 'dashboard',
  });
  // The search isn't an exact match, lets see if we can find a single exact match to use
  const matchingDashboards = results.savedObjects.filter(
    (dashboard) => dashboard.attributes.title.toLowerCase() === title.toLowerCase()
  );
  if (matchingDashboards.length === 1) {
    return { id: matchingDashboards[0].id };
  }
}
