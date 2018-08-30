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

import angular from 'angular';
import 'angular-mocks';
import { i18nProvider } from './provider';
import * as i18n from '../core/i18n';

angular.module('app', []).provider('i18n', i18nProvider);

describe('i18nProvider', () => {
  let provider;
  let service;

  beforeEach(
    angular.mock.module('app', [
      'i18nProvider',
      i18n => {
        service = i18n;
      },
    ])
  );
  beforeEach(
    angular.mock.inject(i18n => {
      provider = i18n;
    })
  );

  it('provides wrapper around i18n engine', () => {
    expect(provider).toEqual(i18n.translate);
  });

  it('provides service wrapper around i18n engine', () => {
    const serviceMethodNames = Object.keys(service);
    const pluginMethodNames = Object.keys(i18n);

    expect([...serviceMethodNames, 'translate'].sort()).toEqual(
      [...pluginMethodNames, '$get'].sort()
    );
  });
});
