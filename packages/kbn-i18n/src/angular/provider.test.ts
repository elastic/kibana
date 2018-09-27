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

import * as i18nCore from '../core/i18n';
import { I18nProvider, I18nServiceType } from './provider';

angular.module('app', []).provider('i18n', I18nProvider);

describe('i18nProvider', () => {
  let provider: I18nProvider;
  let service: I18nServiceType;

  beforeEach(
    angular.mock.module('app', [
      'i18nProvider',
      (i18n: I18nProvider) => {
        provider = i18n;
      },
    ])
  );
  beforeEach(
    angular.mock.inject((i18n: I18nServiceType) => {
      service = i18n;
    })
  );

  test('provides wrapper around i18n engine', () => {
    expect(service).toEqual(i18nCore.translate);
  });

  test('provides service wrapper around i18n engine', () => {
    const serviceMethodNames = Object.keys(provider);
    const pluginMethodNames = Object.keys(i18nCore);

    expect([...serviceMethodNames, 'translate'].sort()).toEqual(
      [...pluginMethodNames, '$get'].sort()
    );
  });
});
