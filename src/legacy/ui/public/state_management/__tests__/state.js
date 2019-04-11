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
import { encode as encodeRison } from 'rison-node';
import '../../private';
import { toastNotifications } from '../../notify';
import * as FatalErrorNS from '../../notify/fatal_error';
import { StateProvider } from '../state';
import {
  unhashQueryString,
} from '../state_hashing';
import {
  createStateHash,
  isStateHash,
} from '../state_storage';
import { HashedItemStore } from '../state_storage/hashed_item_store';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { EventsProvider } from '../../events';

describe('State Management', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  describe('Enabled', () => {
    let $rootScope;
    let $location;
    let Events;
    let setup;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_$rootScope_, _$location_, Private, config) {
      const State = Private(StateProvider);
      $location = _$location_;
      $rootScope = _$rootScope_;
      Events = Private(EventsProvider);

      setup = opts => {
        const { param, initial, storeInHash } = (opts || {});
        sinon.stub(config, 'get').withArgs('state:storeInSessionStorage').returns(!!storeInHash);
        const store = new StubBrowserStorage();
        const hashedItemStore = new HashedItemStore(store);
        const state = new State(param, initial, hashedItemStore);

        const getUnhashedSearch = state => {
          return unhashQueryString($location.search(), [ state ]);
        };

        return { store, hashedItemStore, state, getUnhashedSearch };
      };
    }));

    describe('Provider', () => {
      it('should reset the state to the defaults', () => {
        const { state, getUnhashedSearch } = setup({ initial: { message: ['test'] } });
        state.reset();
        const search = getUnhashedSearch(state);
        expect(search).to.have.property('_s');
        expect(search._s).to.equal('(message:!(test))');
        expect(state.message).to.eql(['test']);
      });

      it('should apply the defaults upon initialization', () => {
        const { state } = setup({ initial: { message: 'test' } });
        expect(state).to.have.property('message', 'test');
      });

      it('should inherit from Events', () => {
        const { state } = setup();
        expect(state).to.be.an(Events);
      });

      it('should emit an event if reset with changes', (done) => {
        const { state } = setup({ initial: { message: ['test'] } });
        state.on('reset_with_changes', (keys) => {
          expect(keys).to.eql(['message']);
          done();
        });
        state.save();
        state.message = 'foo';
        state.reset();
        $rootScope.$apply();
      });

      it('should not emit an event if reset without changes', () => {
        const { state } = setup({ initial: { message: 'test' } });
        state.on('reset_with_changes', () => {
          expect().fail();
        });
        state.save();
        state.message = 'test';
        state.reset();
        $rootScope.$apply();
      });
    });

    describe('Search', () => {
      it('should save to $location.search()', () => {
        const { state, getUnhashedSearch } = setup({ initial: { test: 'foo' } });
        state.save();
        const search = getUnhashedSearch(state);
        expect(search).to.have.property('_s');
        expect(search._s).to.equal('(test:foo)');
      });

      it('should emit an event if changes are saved', (done) => {
        const { state, getUnhashedSearch } = setup();
        state.on('save_with_changes', (keys) => {
          expect(keys).to.eql(['test']);
          done();
        });
        state.test = 'foo';
        state.save();
        getUnhashedSearch(state);
        $rootScope.$apply();
      });
    });

    describe('Fetch', () => {
      it('should emit an event if changes are fetched', (done) => {
        const { state } = setup();
        state.on('fetch_with_changes', (keys) => {
          expect(keys).to.eql(['foo']);
          done();
        });
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        expect(state).to.have.property('foo', 'bar');
        $rootScope.$apply();
      });

      it('should have events that attach to scope', (done) => {
        const { state } = setup();
        state.on('test', (message) => {
          expect(message).to.equal('foo');
          done();
        });
        state.emit('test', 'foo');
        $rootScope.$apply();
      });

      it('should fire listeners for #onUpdate() on #fetch()', (done) => {
        const { state } = setup();
        state.on('fetch_with_changes', (keys) => {
          expect(keys).to.eql(['foo']);
          done();
        });
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        expect(state).to.have.property('foo', 'bar');
        $rootScope.$apply();
      });

      it('should apply defaults to fetches', () => {
        const { state } = setup({ initial: { message: 'test' } });
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        expect(state).to.have.property('foo', 'bar');
        expect(state).to.have.property('message', 'test');
      });

      it('should call fetch when $routeUpdate is fired on $rootScope', () => {
        const { state } = setup();
        const spy = sinon.spy(state, 'fetch');
        $rootScope.$emit('$routeUpdate', 'test');
        sinon.assert.calledOnce(spy);
      });

      it('should clear state when missing form URL', () => {
        let stateObj;
        const { state } = setup();

        // set state via URL
        $location.search({ _s: '(foo:(bar:baz))' });
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({ foo: { bar: 'baz' } });

        // ensure changing URL changes state
        $location.search({ _s: '(one:two)' });
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({ one: 'two' });

        // remove search, state should be empty
        $location.search({});
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({});
      });

      it('should clear state when it is invalid', () => {
        let stateObj;
        const { state } = setup();

        $location.search({ _s: '' });
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({});

        $location.search({ _s: '!n' });
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({});

        $location.search({ _s: 'alert(1)' });
        state.fetch();
        stateObj = state.toObject();
        expect(stateObj).to.eql({});
      });

      it('does not replace the state value on read', () => {
        const { state } = setup();
        sinon.stub($location, 'search').callsFake((newSearch) => {
          if (newSearch) {
            return $location;
          } else {
            return {
              [state.getQueryParamName()]: '(a:1)'
            };
          }
        });
        const replaceStub = sinon.stub($location, 'replace').returns($location);

        state.fetch();
        sinon.assert.notCalled(replaceStub);
      });
    });

    describe('Hashing', () => {
      it('stores state values in a hashedItemStore, writing the hash to the url', () => {
        const { state, hashedItemStore } = setup({ storeInHash: true });
        state.foo = 'bar';
        state.save();
        const urlVal = $location.search()[state.getQueryParamName()];

        expect(isStateHash(urlVal)).to.be(true);
        expect(hashedItemStore.getItem(urlVal)).to.eql(JSON.stringify({ foo: 'bar' }));
      });

      it('should replace rison in the URL with a hash', () => {
        const { state, hashedItemStore } = setup({ storeInHash: true });
        const obj = { foo: { bar: 'baz' } };
        const rison = encodeRison(obj);

        $location.search({ _s: rison });
        state.fetch();

        const urlVal = $location.search()._s;
        expect(urlVal).to.not.be(rison);
        expect(isStateHash(urlVal)).to.be(true);
        expect(hashedItemStore.getItem(urlVal)).to.eql(JSON.stringify(obj));
      });

      describe('error handling', () => {
        it('notifies the user when a hash value does not map to a stored value', () => {
          // Ideally, state.js shouldn't be tightly coupled to toastNotifications. Instead, it
          // should notify its consumer of this error state and the consumer should be responsible
          // for notifying the user of the error. This test verifies the side effect of the error
          // until we can remove this coupling.

          // Clear existing toasts.
          toastNotifications.list.splice(0);

          const { state } = setup({ storeInHash: true });
          const search = $location.search();
          const badHash = createStateHash('{"a": "b"}', () => null);

          search[state.getQueryParamName()] = badHash;
          $location.search(search);

          expect(toastNotifications.list).to.have.length(0);
          state.fetch();
          expect(toastNotifications.list).to.have.length(1);
          expect(toastNotifications.list[0].title).to.match(/use the share functionality/i);
        });

        it.skip('triggers fatal error linking to github when setting item fails', () => {
          // NOTE: this test needs to be written in jest and removed from the browser ones
          // More info could be read in the opened issue:
          // https://github.com/elastic/kibana/issues/22751
          const { state, hashedItemStore } = setup({ storeInHash: true });
          const fatalErrorStub = sandbox.stub();
          Object.defineProperty(FatalErrorNS, 'fatalError', {
            writable: true,
            value: fatalErrorStub
          });

          sandbox.stub(hashedItemStore, 'setItem').returns(false);
          state.toQueryParam();
          sinon.assert.calledOnce(fatalErrorStub);
          sinon.assert.calledWith(fatalErrorStub, sinon.match(error => (
            error instanceof Error &&
            error.message.includes('github.com'))
          ));
        });

        it('translateHashToRison should gracefully fallback if parameter can not be parsed', () => {
          const { state, hashedItemStore } = setup({ storeInHash: false });

          expect(state.translateHashToRison('(a:b)')).to.be('(a:b)');
          expect(state.translateHashToRison('')).to.be('');

          const existingHash = createStateHash('{"a": "b"}', () => null);
          hashedItemStore.setItem(existingHash, '{"a": "b"}');

          const nonExistingHash = createStateHash('{"b": "c"}', () => null);

          expect(state.translateHashToRison(existingHash)).to.be('(a:b)');
          expect(state.translateHashToRison(nonExistingHash)).to.be('!n');
        });
      });
    });
  });

  describe('Disabled with persisted state', () => {
    let state;
    let $location;
    let $rootScope;
    const stateParam = '_config_test';

    const getLocationState = () => {
      const search = $location.search();
      return search[stateParam];
    };

    beforeEach(ngMock.module('kibana', function (stateManagementConfigProvider) {
      stateManagementConfigProvider.disable();
    }));
    beforeEach(ngMock.inject(function (_$rootScope_, _$location_, Private, config) {
      const State = Private(StateProvider);
      $location = _$location_;
      $rootScope = _$rootScope_;

      sinon.stub(config, 'get').withArgs('state:storeInSessionStorage').returns(false);

      class MockPersistedState extends State {
        _persistAcrossApps = true
      }

      MockPersistedState.prototype._persistAcrossApps = true;

      state = new MockPersistedState(stateParam);
    }));

    describe('changing state', () => {
      const methods = ['save', 'replace', 'reset'];

      methods.forEach((method) => {
        it(`${method} should not change the URL`, () => {
          $location.search({ _s: '(foo:bar)' });
          state[method]();
          $rootScope.$apply();
          expect(getLocationState()).to.be(undefined);
        });
      });
    });

    describe('reading state', () => {
      it('should not change the URL', () => {
        const saveSpy = sinon.spy(state, 'save');
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        $rootScope.$apply();
        sinon.assert.notCalled(saveSpy);
        expect(getLocationState()).to.be(undefined);
      });
    });
  });
});
