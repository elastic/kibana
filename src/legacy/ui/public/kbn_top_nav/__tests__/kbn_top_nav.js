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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { assign, pluck } from 'lodash';
import $ from 'jquery';

import '../kbn_top_nav';
import { KbnTopNavControllerProvider } from '../kbn_top_nav_controller';

describe('kbnTopNav directive', function () {
  let build;
  let KbnTopNavController;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($compile, $rootScope, Private) {
    KbnTopNavController = Private(KbnTopNavControllerProvider);

    build = function (scopeVars = {}, attrs = {}) {
      const $el = $('<kbn-top-nav name="foo">').attr(attrs);
      const $scope = $rootScope.$new();
      assign($scope, scopeVars);
      $compile($el)($scope);
      $scope.$digest();
      return { $el, $scope };
    };
  }));

  it('sets the proper functions on the kbnTopNav prop on scope', function () {
    const { $scope } = build();
    expect($scope.kbnTopNav.open).to.be.a(Function);
    expect($scope.kbnTopNav.close).to.be.a(Function);
    expect($scope.kbnTopNav.getCurrent).to.be.a(Function);
    expect($scope.kbnTopNav.toggle).to.be.a(Function);
  });

  it('allows config at nested keys', function () {
    const scopeVars = {
      kbn: {
        top: {
          nav: [
            { key: 'foo' }
          ]
        }
      }
    };

    const { $scope } = build(scopeVars, { config: 'kbn.top.nav' });
    const optKeys = pluck($scope.kbnTopNav.opts, 'key');
    expect(optKeys).to.eql(['foo']);
  });

  it('uses the KbnTopNavController if passed via config attribute', function () {
    const controller = new KbnTopNavController();
    const { $scope } = build({ controller }, { config: 'controller' });
    expect($scope.kbnTopNav).to.be(controller);
  });

  it('should allow setting CSS classes via className', () => {
    const scope = {
      config: [
        { key: 'foo', testId: 'foo', className: 'fooClass' },
        { key: 'test', testId: 'test', className: 'class1 class2' },
      ],
    };
    const { $el } = build(scope, { config: 'config' });
    expect($el.find('[data-test-subj="foo"]').hasClass('fooClass')).to.be(true);
    expect($el.find('[data-test-subj="test"]').hasClass('class1')).to.be(true);
    expect($el.find('[data-test-subj="test"]').hasClass('class2')).to.be(true);
  });
});
