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
import '../json_input';


describe('JSON input validation', function () {
  let $compile;
  let $rootScope;
  const html = '<input ng-model="value" json-input require-keys=true />';
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  beforeEach(function () {
    element = $compile(html)($rootScope);
  });

  it('should be able to require keys', function () {
    element.val('{}');
    element.trigger('input');
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should be able to not require keys', function () {
    const html = '<input ng-model="value" json-input require-keys=false />';
    const element = $compile(html)($rootScope);

    element.val('{}');
    element.trigger('input');
    expect(element.hasClass('ng-valid')).to.be.ok();
  });

  it('should be able to read parse an input', function () {
    element.val('{}');
    element.trigger('input');
    expect($rootScope.value).to.eql({});
  });

  it('should not allow invalid json', function () {
    element.val('{foo}');
    element.trigger('input');
    expect(element.hasClass('ng-invalid')).to.be.ok();
  });

  it('should allow valid json', function () {
    element.val('{"foo": "bar"}');
    element.trigger('input');
    expect($rootScope.value).to.eql({ foo: 'bar' });
    expect(element.hasClass('ng-valid')).to.be.ok();
  });
});
