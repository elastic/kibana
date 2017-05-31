import expect from 'expect.js';
import ngMock from 'ng_mock';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action increaseSuccessorCount', function () {
    let increaseSuccessorCount;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      increaseSuccessorCount = Private(QueryParameterActionsProvider).increaseSuccessorCount;
    }));

    it('should increase the successorCount by the given value', function () {
      const state = createStateStub();

      increaseSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).to.equal(30);
    });

    it('should increase the successorCount by the default step size if not value is given', function () {
      const state = createStateStub();

      increaseSuccessorCount(state)();

      expect(state.queryParameters.successorCount).to.equal(13);
    });

    it('should limit the successorCount to 0 as a lower bound', function () {
      const state = createStateStub();

      increaseSuccessorCount(state)(-20);

      expect(state.queryParameters.successorCount).to.equal(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', function () {
      const state = createStateStub();

      increaseSuccessorCount(state)(20000);

      expect(state.queryParameters.successorCount).to.equal(10000);
    });
  });
});
