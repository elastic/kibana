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
import sinon from 'sinon';

describe('Promise service', () => {
  let Promise;
  let $rootScope;

  const sandbox = sinon.createSandbox();
  function tick(ms = 0) {
    sandbox.clock.tick(ms);

    // Ugly, but necessary for promises to resolve: https://github.com/angular/angular.js/issues/12555
    $rootScope.$apply();
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(($injector) => {
      sandbox.useFakeTimers();

      Promise = $injector.get('Promise');
      $rootScope = $injector.get('$rootScope');
    })
  );

  afterEach(() => sandbox.restore());

  describe('Constructor', () => {
    it('provides resolve and reject function', () => {
      const executor = sinon.stub();
      new Promise(executor);

      sinon.assert.calledOnce(executor);
      sinon.assert.calledWithExactly(executor, sinon.match.func, sinon.match.func);
    });
  });

  it('Promise.resolve', () => {
    const onResolve = sinon.stub();
    Promise.resolve(true).then(onResolve);

    tick();

    sinon.assert.calledOnce(onResolve);
    sinon.assert.calledWithExactly(onResolve, true);
  });

  describe('Promise.fromNode', () => {
    it('creates a callback that controls a promise', () => {
      const callback = sinon.stub();
      Promise.fromNode(callback);

      tick();

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, sinon.match.func);
    });

    it('rejects if the callback receives an error', () => {
      const err = new Error();
      const onReject = sinon.stub();
      Promise.fromNode(sinon.stub().yields(err)).catch(onReject);

      tick();

      sinon.assert.calledOnce(onReject);
      sinon.assert.calledWithExactly(onReject, sinon.match.same(err));
    });

    it('resolves with the second argument', () => {
      const result = {};
      const onResolve = sinon.stub();
      Promise.fromNode(sinon.stub().yields(null, result)).then(onResolve);

      tick();

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledWithExactly(onResolve, sinon.match.same(result));
    });

    it('resolves with an array if multiple arguments are received', () => {
      const result1 = {};
      const result2 = {};
      const onResolve = sinon.stub();
      Promise.fromNode(sinon.stub().yields(null, result1, result2)).then(onResolve);

      tick();

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledWithExactly(onResolve, [
        sinon.match.same(result1),
        sinon.match.same(result2),
      ]);
    });

    it('resolves with an array if multiple undefined are received', () => {
      const onResolve = sinon.stub();
      Promise.fromNode(sinon.stub().yields(null, undefined, undefined)).then(onResolve);

      tick();

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledWithExactly(onResolve, [undefined, undefined]);
    });
  });

  describe('Promise.race()', () => {
    it(`resolves with the first resolved promise's value`, () => {
      const p1 = new Promise((resolve) => setTimeout(resolve, 100, 1));
      const p2 = new Promise((resolve) => setTimeout(resolve, 200, 2));
      const onResolve = sinon.stub();
      Promise.race([p1, p2]).then(onResolve);

      tick(200);

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledWithExactly(onResolve, 1);
    });

    it(`rejects with the first rejected promise's rejection reason`, () => {
      const p1Error = new Error('1');
      const p1 = new Promise((r, reject) => setTimeout(reject, 200, p1Error));

      const p2Error = new Error('2');
      const p2 = new Promise((r, reject) => setTimeout(reject, 100, p2Error));

      const onReject = sinon.stub();
      Promise.race([p1, p2]).catch(onReject);

      tick(200);

      sinon.assert.calledOnce(onReject);
      sinon.assert.calledWithExactly(onReject, sinon.match.same(p2Error));
    });

    it('does not wait for subsequent promises to resolve/reject', () => {
      const onP1Resolve = sinon.stub();
      const p1 = new Promise((resolve) => setTimeout(resolve, 100)).then(onP1Resolve);

      const onP2Resolve = sinon.stub();
      const p2 = new Promise((resolve) => setTimeout(resolve, 101)).then(onP2Resolve);

      const onResolve = sinon.stub();
      Promise.race([p1, p2]).then(onResolve);

      tick(100);

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledOnce(onP1Resolve);
      sinon.assert.callOrder(onP1Resolve, onResolve);
      sinon.assert.notCalled(onP2Resolve);
    });

    it('allows non-promises in the array', () => {
      const onResolve = sinon.stub();
      Promise.race([1, 2, 3]).then(onResolve);

      tick();

      sinon.assert.calledOnce(onResolve);
      sinon.assert.calledWithExactly(onResolve, 1);
    });

    describe('argument is undefined', () => {
      it('rejects the promise', () => {
        const football = {};
        const onReject = sinon.stub();
        Promise.race()
          .catch(() => football)
          .then(onReject);

        tick();

        sinon.assert.calledOnce(onReject);
        sinon.assert.calledWithExactly(onReject, sinon.match.same(football));
      });
    });

    describe('argument is a string', () => {
      it(`resolves with the first character`, () => {
        const onResolve = sinon.stub();
        Promise.race('abc').then(onResolve);

        tick();

        sinon.assert.calledOnce(onResolve);
        sinon.assert.calledWithExactly(onResolve, 'a');
      });
    });

    describe('argument is a non-iterable object', () => {
      it('reject the promise', () => {
        const football = {};
        const onReject = sinon.stub();
        Promise.race({})
          .catch(() => football)
          .then(onReject);

        tick();

        sinon.assert.calledOnce(onReject);
        sinon.assert.calledWithExactly(onReject, sinon.match.same(football));
      });
    });

    describe('argument is a generator', () => {
      it('resolves with the first resolved value', () => {
        function* gen() {
          yield new Promise((resolve) => setTimeout(resolve, 100, 1));
          yield new Promise((resolve) => setTimeout(resolve, 200, 2));
        }

        const onResolve = sinon.stub();
        Promise.race(gen()).then(onResolve);

        tick(200);

        sinon.assert.calledOnce(onResolve);
        sinon.assert.calledWithExactly(onResolve, 1);
      });

      it('resolves with the first non-promise value', () => {
        function* gen() {
          yield 1;
          yield new Promise((resolve) => setTimeout(resolve, 200, 2));
        }

        const onResolve = sinon.stub();
        Promise.race(gen()).then(onResolve);

        tick(200);

        sinon.assert.calledOnce(onResolve);
        sinon.assert.calledWithExactly(onResolve, 1);
      });

      it('iterates all values from the generator, even if one is already "resolved"', () => {
        let yieldCount = 0;
        function* gen() {
          yieldCount += 1;
          yield 1;
          yieldCount += 1;
          yield new Promise((resolve) => setTimeout(resolve, 200, 2));
        }

        const onResolve = sinon.stub();
        Promise.race(gen()).then(onResolve);

        tick(200);

        sinon.assert.calledOnce(onResolve);
        sinon.assert.calledWithExactly(onResolve, 1);
        expect(yieldCount).to.be(2);
      });
    });
  });
});
