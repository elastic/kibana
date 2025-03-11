/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';
import { ResolvedLink } from '../types';
import { DASHBOARD_LINK_TYPE, EXTERNAL_LINK_TYPE, Link } from '../../common/content_management';
import { validateUrl } from '../components/external_link/external_link_tools';
import { fetchDashboard } from '../components/dashboard_link/dashboard_link_tools';
import { DashboardLinkStrings } from '../components/dashboard_link/dashboard_link_strings';
import { LinksStrings } from '../components/links_strings';

export const getOrderedLinkList = (links: ResolvedLink[]): ResolvedLink[] => {
  return [...links].sort((linkA, linkB) => {
    return linkA.order - linkB.order;
  });
};

/**
 * Memoizing this prevents the links panel editor from having to unnecessarily calculate this
 * a second time once the embeddable exists - after all, the links component should have already
 * calculated this so, we can get away with using the cached version in the editor
 */
export const memoizedGetOrderedLinkList = memoize(
  (links: ResolvedLink[]) => {
    return getOrderedLinkList(links);
  },
  (links: ResolvedLink[]) => {
    return links;
  }
);

export async function resolveLinks(links: Link[] = []) {
  const resolvedLinkInfos = await Promise.all(
    links.map(async (link) => {
      return { ...link, ...(await resolveLinkInfo(link)) };
    })
  );
  return getOrderedLinkList(resolvedLinkInfos);
}

export async function resolveLinkInfo(
  link: Link
): Promise<{ title: string; label?: string; description?: string; error?: Error }> {
  if (link.type === EXTERNAL_LINK_TYPE) {
    const info = { title: link.label ?? link.destination };
    const { valid, message } = validateUrl(link.destination);
    if (valid) {
      return info;
    }
    return { ...info, error: new Error(message) };
  }
  if (link.type === DASHBOARD_LINK_TYPE) {
    if (!link.destination) return { title: '' };
    try {
      const {
        attributes: { title, description },
      } = await fetchDashboard(link.destination);
      return { label: link.label, title, description };
    } catch (error) {
      return {
        title: DashboardLinkStrings.getDashboardErrorLabel(),
        description: error.message,
        error,
      };
    }
  }
  throw new Error(LinksStrings.embeddable.getUnsupportedLinkTypeError());
}
