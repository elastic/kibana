import expect from 'expect.js';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  describe('action increasePredecessorCount', function () {
    it('should increase the predecessorCount by the given value', function () {
      const { increasePredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increasePredecessorCount(state)(20);

      expect(state.queryParameters.predecessorCount).to.equal(30);
    });

    it('should increase the predecessorCount by the default step size if not value is given', function () {
      const { increasePredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increasePredecessorCount(state)();

      expect(state.queryParameters.predecessorCount).to.equal(13);
    });

    it('should limit the predecessorCount to 0 as a lower bound', function () {
      const { increasePredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increasePredecessorCount(state)(-20);

      expect(state.queryParameters.predecessorCount).to.equal(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', function () {
      const { increasePredecessorCount } = new QueryParameterActionsProvider();
      const state = createStateStub();

      increasePredecessorCount(state)(20000);

      expect(state.queryParameters.predecessorCount).to.equal(10000);
    });
  });
});
