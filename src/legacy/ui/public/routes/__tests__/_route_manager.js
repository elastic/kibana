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

import _ from 'lodash';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import RouteManager from '../route_manager';
import expect from '@kbn/expect';

let routes; // will contain an new instance of RouteManager for each test
const chainableMethods = [
  { name: 'when', args: ['', {}] },
  { name: 'otherwise', args: [{}] },
  { name: 'defaults', args: [/regexp/, {}] },
];

let $rp;
describe('routes/route_manager', function() {
  beforeEach(
    ngMock.module('kibana', function($routeProvider) {
      $rp = $routeProvider;
      sinon.stub($rp, 'otherwise');
      sinon.stub($rp, 'when');
    })
  );

  beforeEach(
    ngMock.inject(function() {
      routes = new RouteManager();
    })
  );

  it('should have chainable methods: ' + _.pluck(chainableMethods, 'name').join(', '), function() {
    chainableMethods.forEach(function(meth) {
      expect(routes[meth.name].apply(routes, _.clone(meth.args))).to.be(routes);
    });
  });

  describe('#otherwise', function() {
    it('should forward the last otherwise route', function() {
      const otherRoute = {};
      routes.otherwise({});
      routes.otherwise(otherRoute);

      routes.config($rp);

      expect($rp.otherwise.callCount).to.be(1);
      expect($rp.otherwise.getCall(0).args[0]).to.be(otherRoute);
    });
  });

  describe('#when', function() {
    it('should merge the additions into the when() defined routes', function() {
      routes.when('/some/route');
      routes.when('/some/other/route');

      // add the addition resolve to every route
      routes.defaults(/.*/, {
        resolve: {
          addition: function() {},
        },
      });

      routes.config($rp);

      // should have run once for each when route
      expect($rp.when.callCount).to.be(2);
      expect($rp.otherwise.callCount).to.be(0);

      // every route should have the "addition" resolve
      expect($rp.when.getCall(0).args[1].resolve.addition).to.be.a('function');
      expect($rp.when.getCall(1).args[1].resolve.addition).to.be.a('function');
    });
  });

  describe('#config', function() {
    it('should add defined routes to the global $routeProvider service in order', function() {
      const args = [['/one', {}], ['/two', {}]];

      args.forEach(function(a) {
        routes.when(a[0], a[1]);
      });

      routes.config($rp);

      expect($rp.when.callCount).to.be(args.length);
      _.times(args.length, function(i) {
        const call = $rp.when.getCall(i);
        const a = args.shift();

        expect(call.args[0]).to.be(a[0]);
        expect(call.args[1]).to.be(a[1]);
      });
    });

    it('sets route.reloadOnSearch to false by default', function() {
      routes.when('/nothing-set');
      routes.when('/no-reload', { reloadOnSearch: false });
      routes.when('/always-reload', { reloadOnSearch: true });
      routes.config($rp);

      expect($rp.when.callCount).to.be(3);
      expect($rp.when.firstCall.args[1]).to.have.property('reloadOnSearch', false);
      expect($rp.when.secondCall.args[1]).to.have.property('reloadOnSearch', false);
      expect($rp.when.lastCall.args[1]).to.have.property('reloadOnSearch', true);
    });

    it('sets route.requireDefaultIndex to false by default', function() {
      routes.when('/nothing-set');
      routes.when('/no-index-required', { requireDefaultIndex: false });
      routes.when('/index-required', { requireDefaultIndex: true });
      routes.config($rp);

      expect($rp.when.callCount).to.be(3);
      expect($rp.when.firstCall.args[1]).to.have.property('requireDefaultIndex', false);
      expect($rp.when.secondCall.args[1]).to.have.property('requireDefaultIndex', false);
      expect($rp.when.lastCall.args[1]).to.have.property('requireDefaultIndex', true);
    });
  });

  describe('#defaults()', () => {
    it('adds defaults to routes with matching paths', () => {
      routes.when('/foo', { name: 'foo' });
      routes.when('/bar', { name: 'bar' });
      routes.when('/baz', { name: 'baz' });
      routes.defaults(/^\/ba/, {
        withDefaults: true,
      });
      routes.config($rp);

      sinon.assert.calledWithExactly(
        $rp.when,
        '/foo',
        sinon.match({ name: 'foo', withDefaults: undefined })
      );
      sinon.assert.calledWithExactly(
        $rp.when,
        '/bar',
        sinon.match({ name: 'bar', withDefaults: true })
      );
      sinon.assert.calledWithExactly(
        $rp.when,
        '/baz',
        sinon.match({ name: 'baz', withDefaults: true })
      );
    });

    it('does not override values specified in the route', () => {
      routes.when('/foo', { name: 'foo' });
      routes.defaults(/./, { name: 'bar' });
      routes.config($rp);

      sinon.assert.calledWithExactly($rp.when, '/foo', sinon.match({ name: 'foo' }));
    });

    // See https://github.com/elastic/kibana/issues/13294
    it('does not assign defaults by reference, to prevent accidentally merging unrelated defaults together', () => {
      routes.when('/foo', { name: 'foo' });
      routes.when('/bar', { name: 'bar' });
      routes.when('/baz', { name: 'baz', funcs: { bazFunc() {} } });

      // multiple defaults must be defined that, when applied correctly, will
      // create a new object property on all routes that is unique to all of them
      routes.defaults(/./, { funcs: { all() {} } });
      routes.defaults(/^\/foo/, { funcs: { fooFunc() {} } });
      routes.defaults(/^\/bar/, { funcs: { barFunc() {} } });
      routes.config($rp);

      sinon.assert.calledThrice($rp.when);
      sinon.assert.calledWithExactly(
        $rp.when,
        '/foo',
        sinon.match({
          name: 'foo',
          funcs: sinon.match({
            all: sinon.match.func,
            fooFunc: sinon.match.func,
            barFunc: undefined,
            bazFunc: undefined,
          }),
        })
      );
      sinon.assert.calledWithExactly(
        $rp.when,
        '/bar',
        sinon.match({
          name: 'bar',
          funcs: sinon.match({
            all: sinon.match.func,
            fooFunc: undefined,
            barFunc: sinon.match.func,
            bazFunc: undefined,
          }),
        })
      );
      sinon.assert.calledWithExactly(
        $rp.when,
        '/baz',
        sinon.match({
          name: 'baz',
          funcs: sinon.match({
            all: sinon.match.func,
            fooFunc: undefined,
            barFunc: undefined,
            bazFunc: sinon.match.func,
          }),
        })
      );
    });
  });
});
