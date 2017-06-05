import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import { DocSourceProvider } from '../../data_source/doc_source';
import { DocDataRequestProvider } from '../request/doc_data';

describe('Courier DocFetchRequest class', function () {
  let storage;
  let source;
  let defer;
  let req;

  let setVersion;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, Promise, $injector) {
    const DocSource = Private(DocSourceProvider);
    const DocFetchRequest = Private(DocDataRequestProvider);

    storage =
    $injector.get('localStorage').store =
    $injector.get('sessionStorage').store = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
      removeItem: sinon.stub(),
      clear: sinon.stub()
    };

    source = new DocSource({})
    .set('index', 'doc-index')
    .set('type', 'doc-type')
    .set('id', 'doc-id');

    defer = Promise.defer();

    req = new DocFetchRequest(source, defer);

    /**
     * Setup the version numbers for tests. There are two versions for the
     * purposes of these tests.
     *
     * @param {number} mine - the version that the DocSource most
     *                      recently received from elasticsearch.
     * @param {number} theirs - the version that other DocSources have
     *                        received from elasticsearfch.
     */
    setVersion = function (mine, theirs) {
      source._version = mine;
      storage.getItem.withArgs(source._versionKey()).returns(theirs);
    };
  }));

  describe('#canStart', function () {
    it('can if the doc is unknown', function () {
      setVersion(undefined, undefined);

      expect(req.canStart()).to.be(true);
    });

    it('cannot if the doc is unknown but the request is already in progress', function () {
      setVersion(undefined, undefined);
      req.start();

      expect(req.canStart()).to.be(false);
    });

    it('can if the doc is out of date', function () {
      setVersion(1, 2);

      expect(req.canStart()).to.be(true);
    });

    it('can if the doc is out of date and the request is in progress', function () {
      setVersion(1, 2);
      req.start();

      expect(req.canStart()).to.be(true);
    });

    it('cannot if the doc is up to date', function () {
      setVersion(2, 2);

      expect(req.canStart()).to.be(false);
    });

    it('can if the doc is overdated', function () {
      setVersion(5, 2);

      expect(req.canStart()).to.be(true);
    });

    it('can if shared version is cleared', function () {
      setVersion(10, undefined);

      expect(req.canStart()).to.be(true);
    });

    it('can if everyone else has a doc', function () {
      setVersion(undefined, 10);

      expect(req.canStart()).to.be(true);
    });
  });
});
