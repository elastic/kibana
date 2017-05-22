import expect from 'expect.js';
import ngMock from 'ng_mock';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action increasePredecessorCount', function () {
    let increasePredecessorCount;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      increasePredecessorCount = Private(QueryParameterActionsProvider).increasePredecessorCount;
    }));

    it('should increase the predecessorCount by the given value', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(20);

      expect(state.queryParameters.predecessorCount).to.equal(30);
    });

    it('should increase the predecessorCount by the default step size if not value is given', function () {
      const state = createStateStub();

      increasePredecessorCount(state)();

      expect(state.queryParameters.predecessorCount).to.equal(13);
    });

    it('should limit the predecessorCount to 0 as a lower bound', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(-20);

      expect(state.queryParameters.predecessorCount).to.equal(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(20000);

      expect(state.queryParameters.predecessorCount).to.equal(10000);
    });
  });
});
