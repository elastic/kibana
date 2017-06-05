import expect from 'expect.js';
import ngMock from 'ng_mock';

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action setQueryParameters', function () {
    let setQueryParameters;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      setQueryParameters = Private(QueryParameterActionsProvider).setQueryParameters;
    }));

    it('should update the queryParameters with valid properties from the given object', function () {
      const state = createStateStub({
        queryParameters: {
          additionalParameter: 'ADDITIONAL_PARAMETER',
        }
      });

      setQueryParameters(state)({
        anchorUid: 'ANCHOR_UID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: ['filter'],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });

      expect(state.queryParameters).to.eql({
        additionalParameter: 'ADDITIONAL_PARAMETER',
        anchorUid: 'ANCHOR_UID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: ['filter'],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });
    });

    it('should ignore invalid properties', function () {
      const state = createStateStub();

      setQueryParameters(state)({
        additionalParameter: 'ADDITIONAL_PARAMETER',
      });

      expect(state.queryParameters).to.eql(createStateStub().queryParameters);
    });
  });
});
