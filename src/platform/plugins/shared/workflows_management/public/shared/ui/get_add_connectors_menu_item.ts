/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';

export const getAddConnectorsMenuItem = (
  application: CoreStart['application']
): AppMenuItemType | undefined => {
  if (
    application.capabilities.management?.insightsAndAlerting?.triggersActionsConnectors !== true
  ) {
    return undefined;
  }

  return {
    id: 'addConnectors',
    order: Number.MAX_SAFE_INTEGER,
    label: i18n.translate('workflows.addConnectorsMenuItemLabel', {
      defaultMessage: 'Add connectors',
    }),
    iconType: 'plugs',
    href: application.getUrlForApp('management', {
      deepLinkId: 'triggersActionsConnectors',
      path: '/connectors',
    }),
    overflow: true,
    testId: 'workflowAddConnectorsLink',
  };
};
