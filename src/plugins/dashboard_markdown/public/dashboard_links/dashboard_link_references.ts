/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { DASHBOARD_LINK_PREFIX } from './dashboard_links_plugin';

export const extractDashboardLinkReferences = (markdown: string): Reference[] => {
  const dashboardLinkRegex = new RegExp(`${DASHBOARD_LINK_PREFIX}.*}`, 'g');
  const linkMatches = markdown.match(dashboardLinkRegex);
  const references: Reference[] = [];
  for (const match of linkMatches ?? []) {
    const linkConfigString = match.slice(DASHBOARD_LINK_PREFIX.length, match.length - 1);
    const linkConfig = JSON.parse(linkConfigString);

    references.push({
      name: `dashboard_link_${linkConfig.id}`,
      type: 'dashboard',
      id: linkConfig.id,
    });
  }
  return references;
};
