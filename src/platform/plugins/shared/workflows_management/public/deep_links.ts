/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type AppDeepLink, type AppDeepLinkLocations } from '@kbn/core/public';
import { WorkflowsPageName } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { PLUGIN_NAME } from '../common';

export { WorkflowsPageName };

export interface DeepLinksParams {
  executionsViewEnabled?: boolean;
  libraryEnabled?: boolean;
}

// Exclude classicSideNav to avoid duplicating Workflows entries in the classic hamburger menu.
// Solution side nav uses getWorkflowsNavPanel() for the panel opener submenu instead.
const sideNavVisibleIn: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];

export function getDeepLinks({
  executionsViewEnabled = false,
  libraryEnabled = true,
}: DeepLinksParams = {}): AppDeepLink[] {
  const links: AppDeepLink[] = [
    {
      id: WorkflowsPageName.workflows,
      title: libraryEnabled
        ? i18n.translate('workflowsManagement.nav.workflowsDeepLinkTitle', {
            defaultMessage: 'Workflows',
          })
        : PLUGIN_NAME,
      path: '/',
      ...(libraryEnabled ? { visibleIn: sideNavVisibleIn } : {}),
    },
  ];

  if (libraryEnabled) {
    links.push({
      id: WorkflowsPageName.library,
      title: i18n.translate('workflowsManagement.nav.libraryDeepLinkTitle', {
        defaultMessage: 'Template Library',
      }),
      path: '/library',
      visibleIn: sideNavVisibleIn,
    });
  }

  if (executionsViewEnabled) {
    links.push({
      id: WorkflowsPageName.executions,
      title: i18n.translate('workflowsManagement.nav.executionsDeepLinkTitle', {
        defaultMessage: 'Executions',
      }),
      path: '/executions',
    });
  }

  return links;
}
