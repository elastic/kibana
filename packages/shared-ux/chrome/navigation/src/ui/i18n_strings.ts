/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const getI18nStrings = () => {
  const prefix = 'sharedUXPackages.chrome.sideNavigation';
  return {
    headerLogoAriaText: i18n.translate(`${prefix}.headerLogo.ariaText`, {
      defaultMessage: 'Go to home page',
    }),
    linkToCloudProjects: i18n.translate(`${prefix}.linkToCloud.projects`, {
      defaultMessage: 'My projects',
    }),
    linkToCloudDeployments: i18n.translate(`${prefix}.linkToCloud.deployments`, {
      defaultMessage: 'My deployments',
    }),
  };
};
