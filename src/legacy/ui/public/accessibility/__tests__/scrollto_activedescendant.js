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

import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../scrollto_activedescendant';

describe('scrolltoActivedescendant directive', () => {
  let $compile;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    })
  );

  it('should call scrollIntoView on aria-activedescendant changes', () => {
    const scope = $rootScope.$new();
    scope.ad = '';
    const element = $compile(`<div aria-activedescendant="{{ad}}" scrollto-activedescendant>
      <span id="child1"></span>
      <span id="child2"></span>
    </div>`)(scope);
    const child1 = element.find('#child1');
    const child2 = element.find('#child2');
    sinon.spy(child1[0], 'scrollIntoView');
    sinon.spy(child2[0], 'scrollIntoView');
    scope.ad = 'child1';
    scope.$digest();
    expect(child1[0].scrollIntoView.calledOnce).to.be.eql(true);
    scope.ad = 'child2';
    scope.$digest();
    expect(child2[0].scrollIntoView.calledOnce).to.be.eql(true);
  });
});
