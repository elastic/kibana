import { AddFiltersToKueryProvider } from '../add_filters_to_kuery';
import { FilterManagerProvider } from 'ui/filter_manager';
import NoDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import moment from 'moment';

describe('addFiltersToKuery', function () {
  NoDigestPromises.activateForSuite();

  let addFiltersToKuery;
  let filterManager;
  let timefilter;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    }
  ));

  beforeEach(ngMock.inject(function (Private, _timefilter_) {
    timefilter = _timefilter_;
    addFiltersToKuery = Private(AddFiltersToKueryProvider);
    filterManager = Private(FilterManagerProvider);
    sinon.stub(filterManager, 'add');
  }));


  const filters = [{
    meta: {
      index: 'logstash-*',
      type: 'phrase',
      key: 'machine.os',
      params: {
        query: 'osx'
      },
    },
    query: {
      match: {
        'machine.os': {
          query: 'osx',
          type: 'phrase'
        }
      }
    }
  }];

  it('should return a Promise', function () {
    const state = {
      query: { query: '', language: 'lucene' }
    };
    expect(addFiltersToKuery(state, filters)).to.be.a(Promise);
  });

  it('should add a query clause equivalent to the given filter', function () {
    const state = {
      query: { query: '', language: 'kuery' }
    };
    return addFiltersToKuery(state, filters)
      .then(() => {
        expect(state.query.query).to.be('"machine.os":"osx"');
      });
  });

  it('time field filters should update the global time filter instead of modifying the query', function () {
    const startTime = moment('1995');
    const endTime = moment('1996');
    const state = {
      query: { query: '', language: 'kuery' }
    };
    const timestampFilter = {
      meta: {
        index: 'logstash-*',
      },
      range: {
        time: {
          gt: startTime.valueOf(),
          lt: endTime.valueOf(),
        }
      }
    };
    return addFiltersToKuery(state, [timestampFilter])
      .then(() => {
        expect(state.query.query).to.be('');
        expect(startTime.isSame(timefilter.time.from)).to.be(true);
        expect(endTime.isSame(timefilter.time.to)).to.be(true);
      });
  });


});
