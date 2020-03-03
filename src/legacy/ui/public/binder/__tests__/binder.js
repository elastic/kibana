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

import { Binder } from '..';
import $ from 'jquery';

describe('Binder class', function() {
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($rootScope) {
      $scope = $rootScope.$new();
    })
  );

  describe('Constructing with a $scope', function() {
    it('accepts a $scope and listens for $destroy', function() {
      sinon.stub($scope, '$on');
      new Binder($scope);
      expect($scope.$on.callCount).to.be(1);
      expect($scope.$on.args[0][0]).to.be('$destroy');
    });

    it('unbinds when the $scope is destroyed', function() {
      const binder = new Binder($scope);
      sinon.stub(binder, 'destroy');
      $scope.$destroy();
      expect(binder.destroy.callCount).to.be(1);
    });
  });

  describe('Binder#on', function() {
    it('binds to normal event emitters', function() {
      const binder = new Binder();
      const emitter = {
        on: sinon.stub(),
        removeListener: sinon.stub(),
      };
      const handler = sinon.stub();

      binder.on(emitter, 'click', handler);
      expect(emitter.on.callCount).to.be(1);
      expect(emitter.on.args[0][0]).to.be('click');
      expect(emitter.on.args[0][1]).to.be(handler);

      binder.destroy();
      expect(emitter.removeListener.callCount).to.be(1);
      expect(emitter.removeListener.args[0][0]).to.be('click');
      expect(emitter.removeListener.args[0][1]).to.be(handler);
    });
  });

  describe('Binder#jqOn', function() {
    it('binds jquery event handlers', function() {
      const binder = new Binder();
      const el = document.createElement('div');
      const handler = sinon.stub();

      binder.jqOn(el, 'click', handler);
      $(el).click();
      expect(handler.callCount).to.be(1);
      binder.destroy();
      $(el).click();
      expect(handler.callCount).to.be(1);
    });
  });
});
