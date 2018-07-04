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
import { i18nDirective } from './directive';
import { i18nProvider } from './provider';
import * as i18n from '../core/i18n';

jest.mock('../core/i18n', () => ({
  translate: jest.fn(),
}));

angular
  .module('app', [])
  .provider('i18n', i18nProvider)
  .directive('i18nId', i18nDirective);

describe('i18nDirective', () => {
  let compile;
  let scope;

  beforeEach(angular.mock.module('app'));
  beforeEach(
    angular.mock.inject(($compile, $rootScope) => {
      compile = $compile;
      scope = $rootScope.$new();
    })
  );
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('provides wrapper under i18n translate function', () => {
    const id = 'id';
    const defaultMessage = 'default-message';

    const element = angular.element(
      `<div
        i18n-id="${id}"
        i18n-default-message="${defaultMessage}"
        values={{}}
      />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(i18n.translate).toHaveBeenCalledTimes(1);
    expect(i18n.translate).toHaveBeenCalledWith(id, {
      defaultMessage,
      values: {},
    });
  });
});
