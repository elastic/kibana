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
import { i18nFilter } from './filter';
import * as i18n from '../core/i18n';

jest.mock('../core/i18n', () => ({
  translate: jest.fn().mockImplementation(() => 'translation'),
}));

angular
  .module('app', [])
  .provider('i18n', i18nProvider)
  .filter('i18n', i18nFilter);

describe('i18nFilter', () => {
  let filter;

  beforeEach(angular.mock.module('app'));
  beforeEach(
    angular.mock.inject(i18nFilter => {
      filter = i18nFilter;
    })
  );
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides wrapper around i18n engine', () => {
    const id = 'id';
    const defaultMessage = 'default-message';
    const values = {};

    const result = filter(id, { defaultMessage, values });

    expect(i18n.translate).toHaveBeenCalledTimes(1);
    expect(i18n.translate).toHaveBeenCalledWith(id, { defaultMessage, values });
    expect(result).toEqual('translation');
  });
});
