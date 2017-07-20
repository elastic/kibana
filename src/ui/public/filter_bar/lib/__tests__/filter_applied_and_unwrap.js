import expect from 'expect.js';
import { filterAppliedAndUnwrap } from 'ui/filter_bar/lib/filter_applied_and_unwrap';

describe('Filter Bar Directive', function () {
  describe('filterAppliedAndUnwrap()', function () {

    const filters = [
      { meta: { apply: true }, exists: { field: '_type' } },
      { meta: { apply: false }, query: { query_string: { query: 'foo:bar' } } }
    ];

    it('should filter the applied and unwrap the filter', function () {
      const results = filterAppliedAndUnwrap(filters);
      expect(results).to.have.length(1);
      expect(results[0]).to.eql(filters[0]);
    });

  });
});
