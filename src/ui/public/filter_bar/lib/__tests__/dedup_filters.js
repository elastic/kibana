import { dedupFilters } from 'ui/filter_bar/lib/dedup_filters';
import expect from 'expect.js';

describe('Filter Bar Directive', function () {
  describe('dedupFilters(existing, filters)', function () {

    it('should return only filters which are not in the existing', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore the disabed attribute when comparing ', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { meta: { disabled: true }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore $state attribute', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { $state: { store: 'appState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { $state: { store: 'globalState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });
  });
});
