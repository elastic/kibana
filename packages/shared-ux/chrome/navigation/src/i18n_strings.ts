/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const getI18nStrings = () => ({
  headerLogoAriaLabel: i18n.translate(
    'sharedUXPackages.chrome.sideNavigation.headerLogo.ariaLabel',
    {
      defaultMessage: 'Go to home page',
    }
  ),
  linkToCloudProjects: i18n.translate(
    'sharedUXPackages.chrome.sideNavigation.linkToCloud.projects',
    {
      defaultMessage: 'My projects',
    }
  ),
  linkToCloudDeployments: i18n.translate(
    'sharedUXPackages.chrome.sideNavigation.linkToCloud.deployments',
    {
      defaultMessage: 'My deployments',
    }
  ),
  recentlyAccessed: i18n.translate(
    'sharedUXPackages.chrome.sideNavigation.recentlyAccessed.title',
    {
      defaultMessage: 'Recent',
    }
  ),
});
