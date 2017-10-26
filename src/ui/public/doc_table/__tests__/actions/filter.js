import { addFilter } from '../../actions/filter';
import { FilterManagerProvider } from 'ui/filter_manager';
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

    it('should add an operator style "is" function to kuery queries', function () {
      const state = {
        query: { query: '', language: 'kuery' }
      };
      addFilter('foo', 'bar', '+', indexPattern, state, filterManager);
      expect(state.query.query).to.be('"foo":"bar"');
    });

    it('should combine the new clause with any existing query clauses using an implicit "and"', function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      addFilter('foo', 'bar', '+', indexPattern, state, filterManager);
      expect(state.query.query).to.be('foo "foo":"bar"');
    });

    it('should support creation of negated clauses', function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      addFilter('foo', 'bar', '-', indexPattern, state, filterManager);
      expect(state.query.query).to.be('foo !"foo":"bar"');
    });

    it('should add an exists query when the provided field name is "_exists_"', function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      addFilter('_exists_', 'baz', '+', indexPattern, state, filterManager);
      expect(state.query.query).to.be('foo exists("baz")');
    });

  });


});
