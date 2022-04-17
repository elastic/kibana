/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/public';

export function getListBreadcrumbs() {
  return [
    {
      text: i18n.translate('indexPatternManagement.dataViews.listBreadcrumb', {
        defaultMessage: 'Data views',
      }),
      href: `/`,
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: i18n.translate('indexPatternManagement.dataViews.createBreadcrumb', {
        defaultMessage: 'Create data view',
      }),
      href: `/create`,
    },
  ];
}

export function getEditBreadcrumbs(indexPattern: DataView) {
  return [
    ...getListBreadcrumbs(),
    {
      text: indexPattern.getName(),
      href: `/patterns/${indexPattern.id}`,
    },
  ];
}

export function getEditFieldBreadcrumbs(indexPattern: DataView, fieldName: string) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: fieldName,
    },
  ];
}

export function getCreateFieldBreadcrumbs(indexPattern: DataView) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createFieldBreadcrumb', {
        defaultMessage: 'Create field',
      }),
    },
  ];
}
