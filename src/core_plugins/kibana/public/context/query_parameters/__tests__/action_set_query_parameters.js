import expect from 'expect.js';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  describe('action setQueryParameters', function () {
    it('should update the queryParameters with valid properties from the given object', function () {
      const { setQueryParameters } = new QueryParameterActionsProvider();
      const state = createStateStub({
        queryParameters: {
          additionalParameter: 'ADDITIONAL_PARAMETER',
        }
      });

      setQueryParameters(state)({
        anchorUid: 'ANCHOR_UID',
        columns: ['column'],
        defaultStepSize: 3,
        indexPattern: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });

      expect(state.queryParameters).to.eql({
        additionalParameter: 'ADDITIONAL_PARAMETER',
        anchorUid: 'ANCHOR_UID',
        columns: ['column'],
        defaultStepSize: 3,
        indexPattern: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });
    });

    it('should ignore invalid properties', function () {
      const { setQueryParameters } = new QueryParameterActionsProvider();
      const state = createStateStub();

      setQueryParameters(state)({
        additionalParameter: 'ADDITIONAL_PARAMETER',
      });

      expect(state.queryParameters).to.eql(createStateStub().queryParameters);
    });
  });
});
