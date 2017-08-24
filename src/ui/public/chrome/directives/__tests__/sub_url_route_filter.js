import ngMock from 'ng_mock';
import expect from 'expect.js';

import { SubUrlRouteFilterProvider } from '../sub_url_route_filter';

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
