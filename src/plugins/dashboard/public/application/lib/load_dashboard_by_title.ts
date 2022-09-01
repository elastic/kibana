/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardSavedObject } from '../..';
import { pluginServices } from '../../services/plugin_services';

export async function attemptLoadDashboardByTitle(
  title: string
): Promise<{ id: string } | undefined> {
  const {
    savedObjects: { client },
  } = pluginServices.getServices();

  const results = await client.find<DashboardSavedObject>({
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
