import { luceneStringToDsl } from '../lucene_string_to_dsl';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import expect from 'expect.js';

describe('build query', function () {

  describe('luceneStringToDsl', function () {

    it('should wrap strings with an ES query_string query', function () {
      const result = luceneStringToDsl('foo:bar');
      const expectedResult = {
        query_string: { query: 'foo:bar' }
      };
      expectDeepEqual(result, expectedResult);
    });

    it('should return a match_all query for empty strings and whitespace', function () {
      const expectedResult = {
        match_all: {}
      };

      expectDeepEqual(luceneStringToDsl(''), expectedResult);
      expectDeepEqual(luceneStringToDsl('   '), expectedResult);
    });

    it('should return non-string arguments without modification', function () {
      const expectedResult = {};
      const result = luceneStringToDsl(expectedResult);
      expect(result).to.be(expectedResult);
      expectDeepEqual(result, expectedResult);
    });

  });

});
