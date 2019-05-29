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


import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../../directives/auto_select_if_only_one';

describe('Auto-select if only one directive', function () {
  let $compile;
  let $rootScope;
  const zeroOptions = [];
  const oneOption = [{ label: 'foo' }];
  const multiOptions = [{ label: 'foo' }, { label: 'bar' }];

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    const html = '<select ng-model="value" ng-options="option.name for option in options" auto-select-if-only-one="options"></select>';
    $compile(html)($rootScope);
    $rootScope.value = null;
  }));

  it('should not auto-select if there are no options', function () {
    $rootScope.options = zeroOptions;
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
  });

  it('should not auto-select if there are multiple options', function () {
    $rootScope.options = multiOptions;
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
  });

  it('should auto-select if there is only one option', function () {
    $rootScope.options = oneOption;
    $rootScope.$digest();
    expect($rootScope.value).to.be(oneOption[0]);
  });

  it('should still auto select if the collection contains 2 items but is filtered to 1', function () {
    $rootScope.options = multiOptions;
    const html = '<select ng-model="value" ng-options="option.name for option in options | filter:{label:\'bar\'}" ' +
    'auto-select-if-only-one="options | filter:{label:\'bar\'}"></select>';
    $compile(html)($rootScope);
    $rootScope.value = null;
    $rootScope.$digest();

    expect($rootScope.value).to.be(multiOptions[1]);
  });

  it('should auto-select if the collection changes', function () {
    $rootScope.options = multiOptions;
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
    $rootScope.options = oneOption;
    $rootScope.$digest();
    expect($rootScope.value).to.be(oneOption[0]);
  });

  it('should auto-select if the collection is mutated', function () {
    $rootScope.options = multiOptions.slice();
    $rootScope.$digest();
    expect($rootScope.value).to.not.be.ok();
    $rootScope.options.length = 1;
    $rootScope.$digest();
    expect($rootScope.value).to.be($rootScope.options[0]);
  });
});
