/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AbstractDataView } from '@kbn/data-views-plugin/common';

export function getListBreadcrumbs(withLink?: boolean) {
  return [
    {
      text: i18n.translate('indexPatternManagement.dataViews.listBreadcrumb', {
        defaultMessage: 'Data views',
      }),
      href: withLink ? `/` : '',
    },
  ];
}

export function getCreateBreadcrumbs(withLink?: boolean) {
  return [
    ...getListBreadcrumbs(true),
    {
      text: i18n.translate('indexPatternManagement.dataViews.createBreadcrumb', {
        defaultMessage: 'Create data view',
      }),
      href: withLink ? `/create` : '',
    },
  ];
}

export function getEditBreadcrumbs(indexPattern: AbstractDataView, withLink?: boolean) {
  return [
    ...getListBreadcrumbs(true),
    {
      text: indexPattern.getName(),
      href: withLink ? `/patterns/${indexPattern.id}` : '',
    },
  ];
}

export function getEditFieldBreadcrumbs(indexPattern: AbstractDataView, fieldName: string) {
  return [
    ...getEditBreadcrumbs(indexPattern, true),
    {
      text: fieldName,
    },
  ];
}

export function getCreateFieldBreadcrumbs(indexPattern: AbstractDataView) {
  return [
    ...getEditBreadcrumbs(indexPattern, true),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createFieldBreadcrumb', {
        defaultMessage: 'Create field',
      }),
    },
  ];
}
