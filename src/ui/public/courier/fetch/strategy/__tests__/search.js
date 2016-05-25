import _ from 'lodash';
import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import SearchStrategyProvider from '../search';

describe('ui/courier/fetch/strategy/search', () => {

  let Promise;
  let $rootScope;
  let search;
  let reqsFetchParams;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    $rootScope = $injector.get('$rootScope');
    search = Private(SearchStrategyProvider);
    reqsFetchParams = [
      {
        index: ['logstash-123'],
        type: 'blah',
        search_type: 'blah2',
        body: { foo: 'bar', $foo: 'bar' }
      }
    ];
  }));

  describe('#clientMethod', () => {
    it('is msearch', () => {
      expect(search.clientMethod).to.equal('msearch');
    });
  });

  describe('#reqsFetchParamsToBody()', () => {
    it('filters out any body properties that begin with $', () => {
      let value;
      search.reqsFetchParamsToBody(reqsFetchParams).then(val => value = val);
      $rootScope.$apply();
      expect(_.includes(value, 'foo')).to.be(true);
      expect(_.includes(value, '$foo')).to.be(false);
    });

    context('when indexList is not empty', () => {
      it('includes the index', () => {
        let value;
        search.reqsFetchParamsToBody(reqsFetchParams).then(val => value = val);
        $rootScope.$apply();
        expect(_.includes(value, '"index":["logstash-123"]')).to.be(true);
      });
    });

    context('when indexList is empty', () => {
      beforeEach(() => reqsFetchParams[0].index = []);

      it('queries the kibana index (.kibana) with a must_not match_all boolean', () => {
        const query = JSON.stringify({
          query: {
            bool: {
              must_not: [
                { match_all: {} }
              ]
            }
          }
        });
        let value;
        search.reqsFetchParamsToBody(reqsFetchParams).then(val => value = val);
        $rootScope.$apply();
        expect(_.includes(value, '"index":[".kibana"]')).to.be(true);
        expect(_.includes(value, query)).to.be(true);
      });
    });
  });

  describe('#getResponses()', () => {
    it('returns the `responses` property of the given arg', () => {
      const responses = [{}];
      const returned = search.getResponses({ responses });
      expect(returned).to.be(responses);
    });
  });
});
