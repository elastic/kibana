import ngMock from 'ngMock';
import expect from 'expect.js';
import moment from 'moment';
import { difference, isEqual } from 'lodash';

import FilterContextProvider from '../filter_context';
import RootSearchSourceProvider from 'ui/courier/data_source/_root_search_source';
import noDigestPromises from 'testUtils/noDigestPromises';
import StubbedIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('filterContext', function () {
  noDigestPromises.activateForSuite();

  let init;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    init = function () {
      const filterContext = Private(FilterContextProvider);
      const rootSearchSource = Private(RootSearchSourceProvider);

      const timefilter = $injector.get('timefilter');
      const indexPattern = Private(StubbedIndexPatternProvider);
      rootSearchSource.getGlobalSource().set('index', indexPattern);

      return { filterContext, rootSearchSource, timefilter, indexPattern };
    };
  }));

  describe('#getEsBoolQuery()', function () {
    it('provides access to the current root-level filters', function () {
      const { rootSearchSource, filterContext, timefilter, indexPattern } = init();

      timefilter.time.mode = 'absolute';
      timefilter.time.from = moment().subtract(1, 'hour').toISOString();
      timefilter.time.to = moment().toISOString();

      // add a filter to the rootSearchSource
      rootSearchSource.get()
      .filter([
        { term: { field: 'term value' } }
      ])
      .query({
        match: { field: 'matcher' }
      });

      // read the filterContext
      return filterContext.getEsBoolQuery()
      .then(function ({ bool }) {
        // the resulting boolQuery should include the filter we added and other contextual filters
        var rootQuery = bool.must.filter(f => isEqual(f, { match: { field: 'matcher' } }));
        var rootFilter = bool.must.filter(f => isEqual(f, { term: { field: 'term value' } }));
        var filterForTime = bool.must.filter(f => isEqual(f, timefilter.get(indexPattern)));

        expect(rootQuery).to.have.length(1);
        expect(rootFilter).to.have.length(1);
        expect(filterForTime).to.have.length(1);
        expect(difference(bool.must, rootQuery, rootFilter, filterForTime)).to.have.length(0);
        expect(bool.must_not).to.have.length(0);
        expect(bool.should).to.have.length(0);
      });
    });
  });
});
