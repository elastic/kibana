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

  describe('#handleResponseError()', () => {
    let error;
    beforeEach(() => {
      error = { status: 404, body: { error: { index: '[-*]' } } };
    });

    it('recovers 404 for index -* with empty response', () => {
      let resp;
      search.handleResponseError(reqsFetchParams, error).then(val => resp = val);
      $rootScope.$apply();

      expect(resp.responses).not.to.be(undefined);
    });

    it('mocks all of the bundled searches', () => {
      let resp;
      reqsFetchParams.push({});
      search.handleResponseError(reqsFetchParams, error).then(val => resp = val);
      $rootScope.$apply();

      expect(Array.isArray(resp.responses)).to.be(true);
      expect(resp.responses.length).to.be(2);
      resp.responses.forEach(res => {
        expect(res.hits.total).to.be(0);
        expect(res.hits.hits.length).to.be(0);
      });
    });

    context('when not a 404', () => {
      it('rejects with the original response', () => {
        error.status = 403;
        let err;
        search.handleResponseError(reqsFetchParams, error).catch(val => err = val);
        $rootScope.$apply();

        expect(err).to.be(error);
      });
    });

    context('when not for -* index', () => {
      it('rejects with the original response', () => {
        error.body.error.index = '[foo-*]';
        let err;
        search.handleResponseError(reqsFetchParams, error).catch(val => err = val);
        $rootScope.$apply();

        expect(err).to.be(error);
      });
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

      it('explicitly negates any indexes', () => {
        let value;
        search.reqsFetchParamsToBody(reqsFetchParams).then(val => value = val);
        $rootScope.$apply();
        expect(_.includes(value, '"index":["-*"]')).to.be(true);
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
