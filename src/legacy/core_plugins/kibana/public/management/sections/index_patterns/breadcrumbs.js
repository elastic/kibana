/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { i18n } from '@kbn/i18n';

export function getListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('kbn.management.indexPatterns.listBreadcrumb', {
        defaultMessage: 'Index patterns',
      }),
      href: '#/management/kibana/index_patterns',
    },
  ];
}

export function getCreateBreadcrumbs() {
  return [
    ...getListBreadcrumbs(),
    {
      text: i18n.translate('kbn.management.indexPatterns.createBreadcrumb', {
        defaultMessage: 'Create index pattern',
      }),
      href: '#/management/kibana/index_pattern',
    },
  ];
}

export function getEditBreadcrumbs($route) {
  const { indexPattern } = $route.current.locals;

  return [
    ...getListBreadcrumbs(),
    {
      text: indexPattern.title,
      href: `#/management/kibana/index_patterns/${indexPattern.id}`,
    },
  ];
}

export function getEditFieldBreadcrumbs($route) {
  const { fieldName } = $route.current.params;

  return [
    ...getEditBreadcrumbs($route),
    {
      text: fieldName,
    },
  ];
}

export function getCreateFieldBreadcrumbs($route) {
  return [
    ...getEditBreadcrumbs($route),
    {
      text: i18n.translate('kbn.management.indexPatterns.createFieldBreadcrumb', {
        defaultMessage: 'Create field',
      }),
    },
  ];
}
