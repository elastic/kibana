import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import IndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import searchResp from 'fixtures/search_response';

import { FetchProvider } from '../fetch';
import { DocSourceProvider } from '../../data_source/doc_source';
import { SearchSourceProvider } from '../../data_source/search_source';

describe('Fetch service', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let es;
  let fetch;
  let Promise;
  let DocSource;
  let SearchSource;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    es = $injector.get('es');
    Promise = $injector.get('Promise');
    fetch = Private(FetchProvider);
    indexPattern = Private(IndexPatternProvider);
    DocSource = Private(DocSourceProvider);
    SearchSource = Private(SearchSourceProvider);
  }));

  describe('#doc(docSource)', function () {
    it('fetches a single doc source', function () {
      const doc = {
        _index: 'test-index',
        _type: 'test-type',
        _id: 'test-id',
      };

      const source = new DocSource({
        index: doc._index,
        type: doc._type,
        id: doc._id
      });

      sinon.stub(es, 'mget').returns(Promise.resolve({
        docs: [doc]
      }));

      return fetch.doc(source).then(function (resp) {
        expect(resp).to.be(doc);
      });
    });
  });

  describe('#search(searchSource)', function () {
    it('fetches a single search source', function () {
      const resp = searchResp;
      const mresp = {
        responses: [resp]
      };

      const source = new SearchSource({
        index: indexPattern
      });

      sinon.stub(es, 'msearch').returns(Promise.resolve(mresp));

      return fetch
      .search(source)
      .then(function (courierResp) {
        expect(courierResp).to.be(resp);
      });
    });
  });
});
