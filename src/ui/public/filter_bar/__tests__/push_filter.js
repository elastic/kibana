import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarPushFilterProvider } from 'ui/filter_bar/push_filter';
describe('Filter Bar pushFilter()', function () {

  let pushFilterFn;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    pushFilterFn = Private(FilterBarPushFilterProvider);
  }));

  it('is a function that returns a function', function () {
    expect(pushFilterFn).to.be.a(Function);
    expect(pushFilterFn({})).to.be.a(Function);
  });

  it('throws an error if passed something besides an object', function () {
    expect(pushFilterFn).withArgs(true).to.throwError();
  });

  describe('pushFilter($state)()', function () {
    let $state;
    let pushFilter;
    let filter;

    beforeEach(ngMock.inject(function () {
      $state = { filters:[] };
      pushFilter = pushFilterFn($state);
      filter = { query: { query_string: { query: '' } } };
    }));

    it('should create the filters property it needed', function () {
      const altState = {};
      pushFilterFn(altState)(filter);
      expect(altState.filters).to.be.an(Array);
    });

    it('should replace the filters property instead of modifying it', function () {
      // If we push directly instead of using pushFilter a $watch('filters') does not trigger

      let oldFilters;

      oldFilters = $state.filters;
      $state.filters.push(filter);
      expect($state.filters).to.equal(oldFilters); // Same object

      oldFilters = $state.filters;
      pushFilter(filter);
      expect($state.filters).to.not.equal(oldFilters); // New object!
    });

    it('should add meta data to the filter', function () {
      pushFilter(filter, true, 'myIndex');
      expect($state.filters[0].meta).to.be.an(Object);

      expect($state.filters[0].meta.negate).to.be(true);
      expect($state.filters[0].meta.index).to.be('myIndex');

      pushFilter(filter, false, 'myIndex');
      expect($state.filters[1].meta.negate).to.be(false);
    });



  });

});
