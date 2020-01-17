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
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '..';

let init;
let $rootScope;
let $compile;

describe('render_directive', function() {
  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
      init = function init(markup = '', definition = {}) {
        const $parentScope = $rootScope;

        // create the markup
        const $elem = angular.element('<render-directive>');
        $elem.html(markup);
        if (definition !== null) {
          $parentScope.definition = definition;
          $elem.attr('definition', 'definition');
        }

        // compile the directive
        $compile($elem)($parentScope);
        $parentScope.$apply();

        const $directiveScope = $elem.isolateScope();

        return { $parentScope, $directiveScope, $elem };
      };
    })
  );

  describe('directive requirements', function() {
    it('should throw if not given a definition', function() {
      expect(() => init('', null)).to.throwException(/must have a definition/);
    });
  });

  describe('rendering with definition', function() {
    it('should call link method', function() {
      const markup = '<p>hello world</p>';
      const definition = {
        link: sinon.stub(),
      };

      init(markup, definition);

      sinon.assert.callCount(definition.link, 1);
    });

    it('should call controller method', function() {
      const markup = '<p>hello world</p>';
      const definition = {
        controller: sinon.stub(),
      };

      init(markup, definition);

      sinon.assert.callCount(definition.controller, 1);
    });
  });

  describe('definition scope binding', function() {
    it('should accept two-way, attribute, and expression binding directives', function() {
      const $el = angular.element(`
        <render-directive
          definition="definition"
          two-way-prop="parentTwoWay"
          attr="Simple Attribute"
          expr="parentExpression()"
          >
          {{two}},{{attr}},{{expr()}}
        </render-directive>
      `);

      const $parentScope = $rootScope.$new();
      $parentScope.definition = {
        scope: {
          two: '=twoWayProp',
          attr: '@',
          expr: '&expr',
        },
      };
      $parentScope.parentTwoWay = true;
      $parentScope.parentExpression = function() {
        return !$parentScope.parentTwoWay;
      };

      $compile($el)($parentScope);
      $parentScope.$apply();

      expect($el.text().trim()).to.eql('true,Simple Attribute,false');
      $parentScope.parentTwoWay = false;
      $parentScope.$apply();
      expect($el.text().trim()).to.eql('false,Simple Attribute,true');
    });
  });
});
