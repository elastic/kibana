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

import { get } from 'lodash';

import uiRoutes from '../routes';
import { KbnUrlProvider } from '../url';

import template from './error_allow_explicit_index.html';

uiRoutes
  .when('/error/multi.allow_explicit_index', { template });

export function ErrorAllowExplicitIndexProvider(Private, Promise) {
  const kbnUrl = Private(KbnUrlProvider);

  return new (class ErrorAllowExplicitIndex {
    test(error) {
      if (!error || error.status !== 400) {
        return false;
      }

      const type = get(error, 'body.error.type');
      const reason = get(error, 'body.error.reason');

      return (
        type === 'illegal_argument_exception' &&
        String(reason).includes('explicit index')
      );
    }

    takeover() {
      kbnUrl.change('/error/multi.allow_explicit_index');
      return Promise.halt();
    }
  });
}
