/**
 * Tests functionality in ui/public/courier/saved_object/saved_object.js
 */

import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

import BluebirdPromise from 'bluebird';
import SavedObjectFactory from '../saved_object/saved_object';
import { stubMapper } from 'test_utils/stub_mapper';
import IndexPatternFactory from 'ui/index_patterns/_index_pattern';

describe('Saved Object', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let savedObjectFactory;
  let IndexPattern;
  let esStub;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    savedObjectFactory = Private(SavedObjectFactory);
    IndexPattern = Private(IndexPatternFactory);
    esStub = $injector.get('es');

    mockEsService();
    stubMapper(Private);
  }));

  /**
   * Some default es stubbing to avoid timeouts and allow a default type of 'dashboard'.
   */
  function mockEsService() {
    // Allows the type 'dashboard' to be used.
    // Unfortunately we need to use bluebird here instead of native promises because there is
    // a call to finally.
    sinon.stub(esStub.indices, 'getFieldMapping').returns(BluebirdPromise.resolve({
      '.kibana' : {
        'mappings': {
          'dashboard': {}
        }
      }
    }));

    // Necessary to avoid a timeout condition.
    sinon.stub(esStub.indices, 'putMapping').returns(BluebirdPromise.resolve());
  };

  /**
   * Stubs some of the es retrieval calls so it returns the given response.
   * @param {Object} mockDocResponse
   */
  function stubESResponse(mockDocResponse) {
    sinon.stub(esStub, 'mget').returns(BluebirdPromise.resolve({ docs: [mockDocResponse] }));
    sinon.stub(esStub, 'index').returns(BluebirdPromise.resolve(mockDocResponse));
  }

  /**
   * Creates a new saved object with the given configuration. Does not call init.
   * @param {Object} config
   * @returns {SavedObject} an instance of SavedObject
   */
  function createSavedObject(config = {}) {
    let savedObject = {};
    savedObjectFactory.call(savedObject, config);
    return savedObject;
  }

  describe ('config', function () {

    it('afterESResp is called', function () {
      let afterESRespCallback = sinon.spy();
      const config = {
        type: 'dashboard',
        afterESResp: afterESRespCallback
      };

      let savedObject = createSavedObject(config);
      return savedObject.init().then(() => {
        expect(afterESRespCallback.called).to.be(true);
      });
    });

    it('init is called', function () {
      let initCallback = sinon.spy();
      const config = {
        type: 'dashboard',
        init: initCallback
      };

      let savedObject = createSavedObject(config);
      return savedObject.init().then(() => {
        expect(initCallback.called).to.be(true);
      });
    });

    it('searchSource creates index when true', function () {
      const indexPatternId = 'testIndexPattern';
      let afterESRespCallback = sinon.spy();

      const config = {
        type: 'dashboard',
        afterESResp: afterESRespCallback,
        searchSource: true,
        indexPattern: indexPatternId
      };

      const mockDocResponse = {
        _source: {},
        _index: indexPatternId,
        _type: 'test-type',
        _id: indexPatternId,
        found: true
      };

      stubESResponse(mockDocResponse);

      let savedObject = createSavedObject(config);
      expect(!!savedObject.searchSource.get('index')).to.be(false);

      return savedObject.init().then(() => {
        expect(afterESRespCallback.called).to.be(true);
        const index = savedObject.searchSource.get('index');
        expect(index instanceof IndexPattern).to.be(true);
        expect(index.id).to.equal(indexPatternId);
      });
    });

    describe('type', function () {
      it('that is not specified throws an error', function () {
        let config = {};

        let savedObject = createSavedObject(config);
        try {
          savedObject.init();
          expect(false).to.be(true);
        } catch (err) {
          expect(err).to.not.be(null);
        }
      });

      it('that is invalid invalid throws an error', function () {
        let config = {type: 'notypeexists'};

        let savedObject = createSavedObject(config);
        try {
          savedObject.init();
          expect(false).to.be(true);
        } catch (err) {
          expect(err).to.not.be(null);
        }
      });

      it('that is valid passes', function () {
        let config = {type: 'dashboard'};
        return createSavedObject(config).init();
      });
    });

    describe('defaults', function () {
      it('applied to object with no id', function () {
        let config = {
          defaults: {testDefault: 'hi'},
          type: 'dashboard'
        };

        let savedObject = createSavedObject(config);
        return savedObject.init().then(() => {
          expect(savedObject.searchSource).to.be(undefined);
          expect(savedObject.defaults.testDefault).to.be(config.defaults.testDefault);
        });
      });

      it('applied to source if an id is given', function () {
        const myId = 'myid';
        const customDefault = 'hi';
        const initialOverwriteMeValue = 'this should get overwritten by the server response';

        let config = {
          defaults: {
            overwriteMe: initialOverwriteMeValue,
            customDefault: customDefault
          },
          type: 'dashboard',
          id: myId
        };

        const serverValue = 'this should override the initial default value given';

        const mockDocResponse = {
          _source: {
            overwriteMe: serverValue
          },
          _index: myId,
          _type: 'dashboard',
          _id: myId,
          found: true
        };

        stubESResponse(mockDocResponse);

        let savedObject = createSavedObject(config);
        return savedObject.init().then(() => {
          expect(!!savedObject._source).to.be(true);
          expect(savedObject.defaults.overwriteMe).to.be(initialOverwriteMeValue);
          expect(savedObject._source.overwriteMe).to.be(serverValue);
          expect(savedObject._source.customDefault).to.be(customDefault);
        });
      });
    });
  });
});
