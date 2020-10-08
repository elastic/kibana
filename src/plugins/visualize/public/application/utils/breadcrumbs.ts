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
