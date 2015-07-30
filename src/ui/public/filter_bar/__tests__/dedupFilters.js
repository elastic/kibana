
var dedupFilters = require('ui/filter_bar/lib/dedupFilters');
var expect = require('expect.js');
describe('Filter Bar Directive', function () {
  describe('dedupFilters(existing, filters)', function () {

    it('should return only filters which are not in the existing', function () {
      var existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore the disabed attribute when comparing ', function () {
      var existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { meta: { disabled: true }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore $state attribute', function () {
      var existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { $state: { store: 'appState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { $state: { store: 'globalState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      var results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });
  });
});