/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardLinkConfig, DASHBOARD_LINK_PREFIX } from './dashboard_links_plugin';

const findLinksRegex = /\[([^\[]+)\](\(.*\))/gm;
const splitMatchRegex = /\[([^\[]+)\]\((.*)\)/;
const dashboardLinkMatcher = '/app/dashboards#/view/';

export const convertLegacyDashboardLinks = (markdown: string) => {
  const linksMatches = markdown.match(findLinksRegex);
  if (!linksMatches) {
    return markdown;
  }
  for (const match of linksMatches) {
    const splitMatch = match.match(splitMatchRegex);
    if (!splitMatch) continue;
    const linkName = splitMatch[1];
    const linkUrl = splitMatch[2];

    // conversion only works on relative Dashboard links - this way we can be sure that they are meant to be in the same space.
    if (!linkUrl.startsWith(dashboardLinkMatcher)) continue;

    const dashboardId = linkUrl.split(dashboardLinkMatcher)[1].split('?')[0];
    const linkConfig: DashboardLinkConfig = { name: linkName, id: dashboardId };
    const linkConfigString = JSON.stringify(linkConfig);
    const dashboardLinkString = `${DASHBOARD_LINK_PREFIX}${linkConfigString}}`;
    markdown = markdown.replace(match, dashboardLinkString);
  }
  return markdown;
};
