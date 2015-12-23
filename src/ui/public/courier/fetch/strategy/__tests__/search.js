describe('ui/courier/fetch/strategy/search', () => {
  const _ = require('lodash');
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

  let Promise;
  let $rootScope;
  let search;
  let reqsFetchParams;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    $rootScope = $injector.get('$rootScope');
    search = Private(require('ui/courier/fetch/strategy/search'));
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

      it('queries .kibana-devnull instead', () => {
        let value;
        search.reqsFetchParamsToBody(reqsFetchParams).then(val => value = val);
        $rootScope.$apply();
        expect(_.includes(value, '"index":[".kibana-devnull"]')).to.be(true);
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
