/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IndexPattern } from '../../../data/public';

export function getListBreadcrumbs() {
  return [
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.listBreadcrumb', {
        defaultMessage: 'Index patterns',
      }),
      href: `/`,
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createBreadcrumb', {
        defaultMessage: 'Create index pattern',
      }),
      href: `/create`,
    },
  ];
}

export function getEditBreadcrumbs(indexPattern: IndexPattern) {
  return [
    ...getListBreadcrumbs(),
    {
      text: indexPattern.title,
      href: `/patterns/${indexPattern.id}`,
    },
  ];
}

export function getEditFieldBreadcrumbs(indexPattern: IndexPattern, fieldName: string) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: fieldName,
    },
  ];
}

export function getCreateFieldBreadcrumbs(indexPattern: IndexPattern) {
  return [
    ...getEditBreadcrumbs(indexPattern),
    {
      text: i18n.translate('indexPatternManagement.indexPatterns.createFieldBreadcrumb', {
        defaultMessage: 'Create field',
      }),
    },
  ];
}
