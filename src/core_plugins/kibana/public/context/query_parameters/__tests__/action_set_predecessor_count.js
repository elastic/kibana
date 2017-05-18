import expect from 'expect.js';
import ngMock from 'ng_mock';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action setPredecessorCount', function () {
    let setPredecessorCount;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      setPredecessorCount = Private(QueryParameterActionsProvider).setPredecessorCount;
    }));

    it('should set the predecessorCount to the given value', function () {
      const state = createStateStub();

      setPredecessorCount(state)(20);

      expect(state.queryParameters.predecessorCount).to.equal(20);
    });

    it('should limit the predecessorCount to 0 as a lower bound', function () {
      const state = createStateStub();

      setPredecessorCount(state)(-1);

      expect(state.queryParameters.predecessorCount).to.equal(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', function () {
      const state = createStateStub();

      setPredecessorCount(state)(20000);

      expect(state.queryParameters.predecessorCount).to.equal(10000);
    });
  });
});
