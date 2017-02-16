import expect from 'expect.js';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  describe('action increaseSuccessorCount', function () {
    it('should increase the successorCount by the given value', function () {
      const { increaseSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increaseSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).to.equal(30);
    });

    it('should increase the successorCount by the default step size if not value is given', function () {
      const { increaseSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increaseSuccessorCount(state)();

      expect(state.queryParameters.successorCount).to.equal(13);
    });

    it('should limit the successorCount to 0 as a lower bound', function () {
      const { increaseSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increaseSuccessorCount(state)(-20);

      expect(state.queryParameters.successorCount).to.equal(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', function () {
      const { increaseSuccessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increaseSuccessorCount(state)(20000);

      expect(state.queryParameters.successorCount).to.equal(10000);
    });
  });
});
