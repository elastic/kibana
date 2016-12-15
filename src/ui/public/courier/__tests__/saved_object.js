/**
 * Tests functionality in ui/public/courier/saved_object/saved_object.js
 */

import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import BluebirdPromise from 'bluebird';

import SavedObjectFactory from '../saved_object/saved_object';
import IndexPatternFactory from 'ui/index_patterns/_index_pattern';
import DocSourceProvider from '../data_source/doc_source';

import { stubMapper } from 'test_utils/stub_mapper';


describe('Saved Object', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let SavedObject;
  let IndexPattern;
  let esStub;
  let DocSource;

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
    sinon.stub(esStub.indices, 'refresh').returns(BluebirdPromise.resolve());
  }

  /**
   * Returns a fake doc response with the given index and id, of type dashboard
   * that can be used to stub es calls.
   * @param indexPatternId
   * @param additionalOptions - object that will be assigned to the mocked doc response.
   * @returns {{_source: {}, _index: *, _type: string, _id: *, found: boolean}}
   */
  function getMockedDocResponse(indexPatternId, additionalOptions = {}) {
    return Object.assign(
      {
        _source: {},
        _index: indexPatternId,
        _type: 'dashboard',
        _id: indexPatternId,
        found: true
      },
      additionalOptions);
  }

  /**
   * Stubs some of the es retrieval calls so it returns the given response.
   * @param {Object} mockDocResponse
   */
  function stubESResponse(mockDocResponse) {
    sinon.stub(esStub, 'mget').returns(BluebirdPromise.resolve({ docs: [mockDocResponse] }));
    sinon.stub(esStub, 'index').returns(BluebirdPromise.resolve(mockDocResponse));
  }

  /**
   * Creates a new saved object with the given configuration and initializes it.
   * Returns the promise that will be completed when the initialization finishes.
   *
   * @param {Object} config
   * @returns {Promise<SavedObject>} A promise that resolves with an instance of
   * SavedObject
   */
  function createInitializedSavedObject(config = {}) {
    const savedObject = new SavedObject(config);
    return savedObject.init();
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (es, Private) {
    SavedObject = Private(SavedObjectFactory);
    IndexPattern = Private(IndexPatternFactory);
    esStub = es;
    DocSource = Private(DocSourceProvider);

    mockEsService();
    stubMapper(Private);
  }));

  describe('save', function () {
    describe(' with copyOnSave', function () {
      it('as true creates a copy on save success', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);
        let newUniqueId;
        return createInitializedSavedObject({type: 'dashboard', id: 'myId'}).then(savedObject => {
          sinon.stub(DocSource.prototype, 'doIndex', function () {
            newUniqueId = savedObject.id;
            expect(newUniqueId).to.not.be('myId');
            mockDocResponse._id = newUniqueId;
            return BluebirdPromise.resolve(newUniqueId);
          });
          savedObject.copyOnSave = true;
          return savedObject.save()
            .then((id) => {
              expect(id).to.be(newUniqueId);
            });
        });
      });

      it('as true does not create a copy when save fails', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);
        const originalId = 'id1';
        return createInitializedSavedObject({type: 'dashboard', id: originalId}).then(savedObject => {
          sinon.stub(DocSource.prototype, 'doIndex', function () {
            return BluebirdPromise.reject('simulated error');
          });
          savedObject.copyOnSave = true;
          return savedObject.save().then(() => {
            throw new Error('Expected a rejection');
          }).catch(() => {
            expect(savedObject.id).to.be(originalId);
          });
        });
      });

      it('as false does not create a copy', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);
        const id = 'myId';
        return createInitializedSavedObject({type: 'dashboard', id: id}).then(savedObject => {
          sinon.stub(DocSource.prototype, 'doIndex', function () {
            expect(savedObject.id).to.be(id);
            return BluebirdPromise.resolve(id);
          });
          savedObject.copyOnSave = false;
          return savedObject.save()
            .then((id) => {
              expect(id).to.be(id);
            });
        });
      });
    });

    it('returns id from server on success', function () {
      return createInitializedSavedObject({type: 'dashboard'}).then(savedObject => {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);
        return savedObject.save()
          .then((id) => {
            expect(id).to.be('myId');
          });
      });
    });

    describe('updates isSaving variable', function () {
      it('on success', function () {
        const id = 'id';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({type: 'dashboard', id: id}).then(savedObject => {
          sinon.stub(DocSource.prototype, 'doIndex', () => {
            expect(savedObject.isSaving).to.be(true);
            return BluebirdPromise.resolve(id);
          });
          expect(savedObject.isSaving).to.be(false);
          return savedObject.save()
            .then((id) => {
              expect(savedObject.isSaving).to.be(false);
            });
        });
      });

      it('on failure', function () {
        return createInitializedSavedObject({type: 'dashboard'}).then(savedObject => {
          sinon.stub(DocSource.prototype, 'doIndex', () => {
            expect(savedObject.isSaving).to.be(true);
            return BluebirdPromise.reject();
          });
          expect(savedObject.isSaving).to.be(false);
          return savedObject.save()
            .catch(() => {
              expect(savedObject.isSaving).to.be(false);
            });
        });
      });
    });
  });

  describe('applyESResp', function () {
    it('throws error if not found', function () {
      return createInitializedSavedObject({ type: 'dashboard' }).then(savedObject => {
        const response = {found: false};
        try {
          savedObject.applyESResp(response);
          expect(true).to.be(false);
        } catch (err) {
          expect(!!err).to.be(true);
        }
      });
    });

    it('preserves original defaults if not overridden', function () {
      const id = 'anid';
      const preserveMeValue = 'here to stay!';
      const config = {
        defaults: {
          preserveMe: preserveMeValue
        },
        type: 'dashboard',
        id: id
      };

      const mockDocResponse = getMockedDocResponse(id);
      stubESResponse(mockDocResponse);

      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          expect(savedObject._source.preserveMe).to.equal(preserveMeValue);
          const response = {found: true, _source: {}};
          return savedObject.applyESResp(response);
        }).then(() => {
          expect(savedObject._source.preserveMe).to.equal(preserveMeValue);
        });
    });

    it('overrides defaults', function () {
      const id = 'anid';
      const config = {
        defaults: {
          flower: 'rose'
        },
        type: 'dashboard',
        id: id
      };

      const mockDocResponse = getMockedDocResponse(id);
      stubESResponse(mockDocResponse);

      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          expect(savedObject._source.flower).to.equal('rose');
          const response = {
            found: true,
            _source: {
              flower: 'orchid'
            }
          };
          return savedObject.applyESResp(response);
        }).then(() => {
          expect(savedObject._source.flower).to.equal('orchid');
        });
    });

    it('overrides previous _source and default values', function () {
      const id = 'anid';
      const config = {
        defaults: {
          dinosaurs: {
            tRex: 'is the scariest'
          }
        },
        type: 'dashboard',
        id: id
      };

      const mockDocResponse = getMockedDocResponse(
        id,
        { _source: { dinosaurs: { tRex: 'is not so bad'}, } });
      stubESResponse(mockDocResponse);


      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          const response = {
            found: true,
            _source: { dinosaurs: { tRex: 'has big teeth' } }
          };

          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(savedObject._source.dinosaurs.tRex).to.equal('has big teeth');
        });
    });

  });

  describe ('config', function () {

    it('afterESResp is called', function () {
      const afterESRespCallback = sinon.spy();
      const config = {
        type: 'dashboard',
        afterESResp: afterESRespCallback
      };

      return createInitializedSavedObject(config).then(() => {
        expect(afterESRespCallback.called).to.be(true);
      });
    });

    it('init is called', function () {
      const initCallback = sinon.spy();
      const config = {
        type: 'dashboard',
        init: initCallback
      };

      return createInitializedSavedObject(config).then(() => {
        expect(initCallback.called).to.be(true);
      });
    });

    describe('searchSource', function () {

      it('when true, creates index', function () {
        const indexPatternId = 'testIndexPattern';
        const afterESRespCallback = sinon.spy();

        const config = {
          type: 'dashboard',
          afterESResp: afterESRespCallback,
          searchSource: true,
          indexPattern: indexPatternId
        };

        stubESResponse(getMockedDocResponse(indexPatternId));

        const savedObject = new SavedObject(config);
        expect(!!savedObject.searchSource.get('index')).to.be(false);

        return savedObject.init().then(() => {
          expect(afterESRespCallback.called).to.be(true);
          const index = savedObject.searchSource.get('index');
          expect(index instanceof IndexPattern).to.be(true);
          expect(index.id).to.equal(indexPatternId);
        });
      });

      it('when false, does not create index', function () {
        const indexPatternId = 'testIndexPattern';
        const afterESRespCallback = sinon.spy();

        const config = {
          type: 'dashboard',
          afterESResp: afterESRespCallback,
          searchSource: false,
          indexPattern: indexPatternId
        };

        stubESResponse(getMockedDocResponse(indexPatternId));

        const savedObject = new SavedObject(config);
        expect(!!savedObject.searchSource).to.be(false);

        return savedObject.init().then(() => {
          expect(afterESRespCallback.called).to.be(true);
          expect(!!savedObject.searchSource).to.be(false);
        });
      });
    });

    describe('type', function () {
      it('that is not specified throws an error', function () {
        const config = {};

        const savedObject = new SavedObject(config);
        try {
          savedObject.init();
          expect(false).to.be(true);
        } catch (err) {
          expect(err).to.not.be(null);
        }
      });

      it('that is invalid invalid throws an error', function () {
        const config = { type: 'notypeexists' };

        const savedObject = new SavedObject(config);
        try {
          savedObject.init();
          expect(false).to.be(true);
        } catch (err) {
          expect(err).to.not.be(null);
        }
      });

      it('that is valid passes', function () {
        const config = { type: 'dashboard' };
        return new SavedObject(config).init();
      });
    });

    describe('defaults', function () {

      function getTestDefaultConfig(extraOptions) {
        return Object.assign({
          defaults: { testDefault: 'hi' },
          type: 'dashboard'
        }, extraOptions);
      }

      function expectDefaultApplied(config) {
        return createInitializedSavedObject(config).then((savedObject) => {
          expect(savedObject.defaults).to.be(config.defaults);
        });
      }

      describe('applied to object when id', function () {

        it('is not specified', function () {
          expectDefaultApplied(getTestDefaultConfig());
        });

        it('is undefined', function () {
          expectDefaultApplied(getTestDefaultConfig({ id: undefined }));
        });

        it('is 0', function () {
          expectDefaultApplied(getTestDefaultConfig({ id: 0 }));
        });

        it('is false', function () {
          expectDefaultApplied(getTestDefaultConfig({ id: false }));
        });
      });

      it('applied to source if an id is given', function () {
        const myId = 'myid';
        const customDefault = 'hi';
        const initialOverwriteMeValue = 'this should get overwritten by the server response';

        const config = {
          defaults: {
            overwriteMe: initialOverwriteMeValue,
            customDefault: customDefault
          },
          type: 'dashboard',
          id: myId
        };

        const serverValue = 'this should override the initial default value given';

        const mockDocResponse = getMockedDocResponse(
          myId,
          { _source: { overwriteMe: serverValue } });

        stubESResponse(mockDocResponse);

        return createInitializedSavedObject(config).then((savedObject) => {
          expect(!!savedObject._source).to.be(true);
          expect(savedObject.defaults).to.be(config.defaults);
          expect(savedObject._source.overwriteMe).to.be(serverValue);
          expect(savedObject._source.customDefault).to.be(customDefault);
        });
      });
    });
  });
});
