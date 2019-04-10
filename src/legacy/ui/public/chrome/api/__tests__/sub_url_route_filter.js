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

import { SubUrlRouteFilterProvider } from '../sub_url_hooks';

describe('kbn-chrome subUrlRouteFilter()', () => {
  describe('no ngRoute', () => {
    beforeEach(ngMock.module('kibana/private'));
    beforeEach(ngMock.inject(($injector) => {
      expect($injector.has('$route')).to.be(false);
    }));

    it('always returns true when there is no $route service', ngMock.inject((Private) => {
      const subUrlRouteFilter = Private(SubUrlRouteFilterProvider);
      expect(subUrlRouteFilter()).to.be(true);
    }));
  });

  describe('with ngRoute', () => {

    beforeEach(ngMock.module('kibana/private', 'ngRoute', $routeProvider => {
      $routeProvider.when('/foo', {
        redirectTo: '/bar'
      });

      $routeProvider.when('/bar', {
        template: '<div>foo => bar</div>'
      });
    }));

    let test;
    beforeEach(ngMock.inject((Private, $location, $rootScope, $route) => {
      test = ({ path, assert }) => {
        const subUrlRouteFilter = Private(SubUrlRouteFilterProvider);
        $location.path(path);

        let result;
        function runAssert() {
          if (result) {
            // only run once
            return;
          }

          try {
            assert($route, subUrlRouteFilter);
            result = {};
          } catch (error) {
            result = { error };
          }
        }

        $rootScope.$on('$routeUpdate', runAssert);
        $rootScope.$on('$routeChangeSuccess', runAssert);
        $rootScope.$apply();

        // when no route matches there is no event so we run manually
        if (!result) {
          runAssert();
        }

        if (result.error) {
          throw result.error;
        }
      };
    }));

    describe('no current route', () => {
      it('returns false', () => {
        test({
          path: '/baz',
          assert($route, subUrlRouteFilter) {
            expect($route.current).to.not.be.ok();
            expect(subUrlRouteFilter()).to.eql(false);
          }
        });
      });
    });

    describe('redirectTo route', () => {
      it('returns false', () => {
        test({
          path: '/foo',
          assert($route, subUrlRouteFilter) {
            expect($route.current).to.be.ok();
            expect($route.current.redirectTo).to.be.ok();
            expect(subUrlRouteFilter()).to.eql(false);
          }
        });
      });
    });

    describe('standard route', () => {
      it('returns true', () => {
        test({
          path: '/bar',
          assert($route, subUrlRouteFilter) {
            expect($route.current).to.be.ok();
            expect($route.current.template).to.be.ok();
            expect(subUrlRouteFilter()).to.eql(true);
          }
        });
      });
    });
  });
});
