/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type AppDeepLink } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_NAME } from '../common';

/**
 * Deep link ids registered by the Workflows app. Use these instead of raw
 * strings when registering deep links or navigating via
 * `application.navigateToApp(PLUGIN_ID, { deepLinkId, path })`.
 */
export enum WorkflowsDeepLinks {
  workflowsList = 'workflowsList',
  executions = 'executions',
  library = 'library',
}

export interface DeepLinksParams {
  executionsViewEnabled: boolean;
  libraryEnabled?: boolean;
}

export function getDeepLinks({
  executionsViewEnabled,
  libraryEnabled = true,
}: DeepLinksParams): AppDeepLink[] {
  const links: AppDeepLink[] = [
    {
      id: WorkflowsDeepLinks.workflowsList,
      title: PLUGIN_NAME,
      path: '/',
    },
  ];

  if (libraryEnabled) {
    links.push({
      id: WorkflowsDeepLinks.library,
      title: i18n.translate('workflowsManagement.nav.libraryDeepLinkTitle', {
        defaultMessage: 'Library',
      }),
      path: '/library',
    });
  }

  if (executionsViewEnabled) {
    links.push({
      id: WorkflowsDeepLinks.executions,
      title: i18n.translate('workflowsManagement.nav.executionsDeepLinkTitle', {
        defaultMessage: 'Executions',
      }),
      path: '/executions',
    });
  }

  return links;
}
