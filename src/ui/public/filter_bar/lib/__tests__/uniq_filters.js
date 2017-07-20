import { uniqFilters } from 'ui/filter_bar/lib/uniq_filters';
import expect from 'expect.js';

describe('Filter Bar Directive', function () {
  describe('uniqFilter', function () {

    it('should filter out dups', function () {
      const before = [
        { query: { _type: { match: { query: 'apache', type: 'phrase' } } } },
        { query: { _type: { match: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });

    it('should filter out duplicates, ignoring meta attributes', function () {
      const before = [
        {
          meta: { negate: true },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        },
        {
          meta: { negate: false },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });

    it('should filter out duplicates, ignoring $state attributes', function () {
      const before = [
        {
          $state: { store: 'appState' },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        },
        {
          $state: { store: 'globalState' },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });
  });
});
