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
import { get } from 'lodash';

import uiRoutes from '../routes';

import template from './error_auto_create_index.html';

uiRoutes.when('/error/action.auto_create_index', {
  template,
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('common.ui.errorAutoCreateIndex.breadcrumbs.errorText', {
        defaultMessage: 'Error',
      }),
    },
  ],
});

export function isAutoCreateIndexError(error: object) {
  return (
    get(error, 'res.status') === 503 &&
    get(error, 'body.attributes.code') === 'ES_AUTO_CREATE_INDEX_ERROR'
  );
}

export function showAutoCreateIndexErrorPage() {
  window.location.hash = '/error/action.auto_create_index';
}
