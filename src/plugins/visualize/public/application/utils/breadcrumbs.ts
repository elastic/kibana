/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { VisualizeConstants } from '../visualize_constants';

const appPrefixes: Record<string, any> = {
  dashboards: {
    text: i18n.translate('visualize.dashboard.prefix.breadcrumb', {
      defaultMessage: 'Dashboard',
    }),
  },
};

const defaultEditText = i18n.translate('visualize.editor.defaultEditBreadcrumbText', {
  defaultMessage: 'Edit',
});

export function getLandingBreadcrumbs() {
  return [
    {
      text: i18n.translate('visualize.listing.breadcrumb', {
        defaultMessage: 'Visualize',
      }),
      href: `#${VisualizeConstants.LANDING_PAGE_PATH}`,
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getLandingBreadcrumbs(),
    {
      text: i18n.translate('visualize.editor.createBreadcrumb', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getBreadcrumbsPrefixedWithApp(originatingApp: string) {
  const originatingAppBreadcrumb = appPrefixes[originatingApp];
  return [originatingAppBreadcrumb, ...getLandingBreadcrumbs(), { text: defaultEditText }];
}

export function getEditBreadcrumbs(text: string = defaultEditText) {
  return [
    ...getLandingBreadcrumbs(),
    {
      text,
    },
  ];
}
