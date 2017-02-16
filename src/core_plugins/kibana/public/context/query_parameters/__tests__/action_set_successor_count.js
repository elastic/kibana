import expect from 'expect.js';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  describe('action setSuccessorCount', function () {
    it('should set the successorCount to the given value', function () {
      const { setSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).to.equal(20);
    });

    it('should limit the successorCount to 0 as a lower bound', function () {
      const { setSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setSuccessorCount(state)(-1);

      expect(state.queryParameters.successorCount).to.equal(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', function () {
      const { setSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setSuccessorCount(state)(20000);

      expect(state.queryParameters.successorCount).to.equal(10000);
    });
  });
});
