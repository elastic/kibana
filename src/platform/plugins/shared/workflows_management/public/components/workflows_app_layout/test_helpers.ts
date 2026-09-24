/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { WorkflowsPageName } from '@kbn/deeplinks-workflows';
import { PLUGIN_ID } from '../../../common';
import type { StartServicesMock } from '../../mocks';

const BASE_URL = `http://localhost:5601/app/${PLUGIN_ID}`;

/** Mirrors the deep links registered by `getDeepLinks`. */
const NAV_LINK_FIXTURES: Record<WorkflowsPageName, { title: string; path: string }> = {
  [WorkflowsPageName.list]: { title: 'Workflows', path: '/' },
  [WorkflowsPageName.library]: { title: 'Template Library', path: '/library' },
  [WorkflowsPageName.executions]: { title: 'Executions', path: '/executions' },
};

/**
 * Stubs `chrome.navLinks` with the deep links for the given pages. `baseUrl` and `href` are
 * absolute while `url` is relative, matching what `toNavLink` produces at runtime.
 */
export const setWorkflowsNavLinks = (
  services: StartServicesMock,
  pages: WorkflowsPageName[]
): void => {
  const navLinksById = new Map(
    pages.map((page) => {
      const { title, path } = NAV_LINK_FIXTURES[page];
      return [
        `${PLUGIN_ID}:${page}`,
        {
          id: `${PLUGIN_ID}:${page}`,
          title,
          baseUrl: BASE_URL,
          href: `${BASE_URL}${path}`,
          url: `/app/${PLUGIN_ID}${path}`,
          visibleIn: ['globalSearch', 'projectSideNav'],
        } as ChromeNavLink,
      ];
    })
  );

  services.chrome.navLinks.get.mockImplementation((id: string) => navLinksById.get(id));
};
