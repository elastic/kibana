import expect from 'expect.js';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  describe('action setPredecessorCount', function () {
    it('should set the predecessorCount to the given value', function () {
      const { setPredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setPredecessorCount(state)(20);

      expect(state.queryParameters.predecessorCount).to.equal(20);
    });

    it('should limit the predecessorCount to 0 as a lower bound', function () {
      const { setPredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setPredecessorCount(state)(-1);

      expect(state.queryParameters.predecessorCount).to.equal(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', function () {
      const { setPredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setPredecessorCount(state)(20000);

      expect(state.queryParameters.predecessorCount).to.equal(10000);
    });
  });
});
