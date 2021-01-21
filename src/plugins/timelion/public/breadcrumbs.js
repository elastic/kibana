/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

const ROOT_BREADCRUMB = {
  text: i18n.translate('timelion.breadcrumbs.root', {
    defaultMessage: 'Timelion',
  }),
  href: '#',
};

export function getCreateBreadcrumbs() {
  return [
    ROOT_BREADCRUMB,
    {
      text: i18n.translate('timelion.breadcrumbs.create', {
        defaultMessage: 'Create',
      }),
    },
  ];
}

export function getSavedSheetBreadcrumbs($route) {
  const { savedSheet } = $route.current.locals;
  return [
    ROOT_BREADCRUMB,
    {
      text: savedSheet.title,
    },
  ];
}
