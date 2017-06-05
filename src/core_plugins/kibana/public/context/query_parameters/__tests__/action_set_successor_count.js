import expect from 'expect.js';
import ngMock from 'ng_mock';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action setSuccessorCount', function () {
    let setSuccessorCount;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      setSuccessorCount = Private(QueryParameterActionsProvider).setSuccessorCount;
    }));

    it('should set the successorCount to the given value', function () {
      const state = createStateStub();

      setSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).to.equal(20);
    });

    it('should limit the successorCount to 0 as a lower bound', function () {
      const state = createStateStub();

      setSuccessorCount(state)(-1);

      expect(state.queryParameters.successorCount).to.equal(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', function () {
      const state = createStateStub();

      setSuccessorCount(state)(20000);

      expect(state.queryParameters.successorCount).to.equal(10000);
    });
  });
});
