import expect from 'expect.js';
import { phraseFilter } from 'src/fixtures/filters';
import {
  getQueryDslFromFilter,
  // getFieldFromFilter,
  // getOperatorFromFilter,
  // getParamsFromFilter,
  // isFilterValid,
  // buildFilter
} from '../filter_editor_utils';

describe('FilterEditorUtils', function () {
  describe('getQueryDslFromFilter', function () {
    it('should return query DSL without meta and $state', function () {
      const queryDsl = getQueryDslFromFilter(phraseFilter);
      expect(queryDsl).to.not.have.key('meta');
      expect(queryDsl).to.not.have.key('$state');
      expect(queryDsl).to.have.key('query');
    });
  });
});
