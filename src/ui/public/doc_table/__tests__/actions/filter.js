import { addFilter } from '../../actions/filter';
import { FilterManagerProvider } from '../../../filter_manager';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import NoDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

describe('doc table filter actions', function () {
  NoDigestPromises.activateForSuite();

  let filterManager;
  let indexPattern;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    }
  ));

  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
    filterManager = Private(FilterManagerProvider);
    sinon.stub(filterManager, 'add');
  }));

  describe('add', function () {

    it('should defer to the FilterManager when dealing with a lucene query', function () {
      const state = {
        query: { query: 'foo', language: 'lucene' }
      };
      const args = ['foo', ['bar'], '+', indexPattern, ];
      addFilter('foo', ['bar'], '+', indexPattern, state, filterManager);
      expect(filterManager.add.calledOnce).to.be(true);
      expect(filterManager.add.calledWith(...args)).to.be(true);
    });

  });


});
