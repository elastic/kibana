/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { matchPath, useHistory, useLocation } from 'react-router-dom';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { WorkflowsPageName } from '@kbn/deeplinks-workflows';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';
import { PLUGIN_ID, PLUGIN_NAME } from '../../../common';

type SolutionNavItems = NonNullable<SolutionNavProps['items']>;

const NAV_PAGES = [WorkflowsPageName.list, WorkflowsPageName.executions, WorkflowsPageName.library];

/**
 * The app-relative path of a nav link, for react-router. `path` is not exposed on `ChromeNavLink`
 * and its `url` is relative while `baseUrl` is absolute, so `href` is the one that can be trimmed.
 */
const getNavLinkPath = (navLink: ChromeNavLink) => navLink.href.replace(navLink.baseUrl, '') || '/';

/**
 * Builds the `SolutionNav` configuration for the Workflows side navigation from the app's
 * registered deep links, which are the source of truth for which pages are currently reachable.
 *
 * Returns `null` when the list page is the only destination, since the navigation would then have
 * nothing to offer.
 */
export const useWorkflowsSolutionNav = (): SolutionNavProps | null => {
  const history = useHistory();
  const { pathname } = useLocation();
  const { navLinks } = useChromeService();

  const pages = NAV_PAGES.flatMap((page) => {
    const navLink = navLinks.get(`${PLUGIN_ID}:${page}`);
    return navLink ? [{ page, navLink, path: getNavLinkPath(navLink) }] : [];
  });

  if (pages.length < 2) {
    return null;
  }

  // The most specific match wins, so the list link's `/` keeps it selected on the routes that have
  // no link of their own, such as the workflow editor (`/create`, `/:id`).
  const selectedPath = pages
    .map(({ path }) => path)
    .sort((a, b) => b.length - a.length)
    .find((path) => matchPath(pathname, { path }) != null);

  const links: SolutionNavItems = pages.map(({ page, navLink, path }) => ({
    id: navLink.id,
    name: navLink.title,
    isSelected: path === selectedPath,
    'data-test-subj': `workflowsSideNav-${page}`,
    ...reactRouterNavigate(history, path),
  }));

  return {
    name: PLUGIN_NAME,
    icon: 'workflow',
    // `SolutionNav` already renders the title, so the group stays unnamed. Nesting the links under
    // it keeps them regular weight; as root items they would be styled as section headings.
    items: [{ id: 'workflowsSideNavGroup', name: undefined, items: links }],
  };
};
