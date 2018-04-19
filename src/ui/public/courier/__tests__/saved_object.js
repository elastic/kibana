import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import BluebirdPromise from 'bluebird';

import { SavedObjectProvider } from '../saved_object/saved_object';
import { IndexPatternProvider } from '../../index_patterns/_index_pattern';
import { SavedObjectsClientProvider } from '../../saved_objects';

import { StubIndexPatternsApiClientModule } from '../../index_patterns/__tests__/stub_index_patterns_api_client';

describe('Saved Object', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let SavedObject;
  let IndexPattern;
  let esDataStub;
  let savedObjectsClientStub;
  let window;

  /**
   * Returns a fake doc response with the given index and id, of type dashboard
   * that can be used to stub es calls.
   * @param indexPatternId
   * @param additionalOptions - object that will be assigned to the mocked doc response.
   * @returns {{attributes: {}, type: string, id: *, _version: integer}}
   */
  function getMockedDocResponse(indexPatternId, additionalOptions = {}) {
    return {
      type: 'dashboard',
      id: indexPatternId,
      _version: 2,
      attributes: {},
      ...additionalOptions
    };
  }

  /**
   * Stubs some of the es retrieval calls so it returns the given response.
   * @param {Object} mockDocResponse
   */
  function stubESResponse(mockDocResponse) {
    // Stub out search for duplicate title:
    sinon.stub(savedObjectsClientStub, 'get').returns(BluebirdPromise.resolve(mockDocResponse));
    sinon.stub(savedObjectsClientStub, 'update').returns(BluebirdPromise.resolve(mockDocResponse));

    sinon.stub(savedObjectsClientStub, 'find').returns(BluebirdPromise.resolve({ savedObjects: [], total: 0 }));
    sinon.stub(savedObjectsClientStub, 'bulkGet').returns(BluebirdPromise.resolve({ savedObjects: [mockDocResponse] }));
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
    savedObject.title = 'my saved object';
    return savedObject.init();
  }

  beforeEach(ngMock.module(
    'kibana',
    StubIndexPatternsApiClientModule,
    // Use the native window.confirm instead of our specialized version to make testing
    // this easier.
    function ($provide) {
      const overrideConfirm = message => window.confirm(message) ? Promise.resolve() : Promise.reject();
      $provide.decorator('confirmModalPromise', () => overrideConfirm);
    })
  );

  beforeEach(ngMock.inject(function (es, Private, $window) {
    SavedObject = Private(SavedObjectProvider);
    IndexPattern = Private(IndexPatternProvider);
    esDataStub = es;
    savedObjectsClientStub = Private(SavedObjectsClientProvider);
    window = $window;
  }));

  describe('save', function () {
    describe('with confirmOverwrite', function () {
      function stubConfirmOverwrite() {
        window.confirm = sinon.stub().returns(true);
        sinon.stub(esDataStub, 'create').returns(BluebirdPromise.reject({ status: 409 }));
      }

      describe('when true', function () {
        it('requests confirmation and updates on yes response', function () {
          stubESResponse(getMockedDocResponse('myId'));
          return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(savedObject => {
            const createStub = sinon.stub(savedObjectsClientStub, 'create');
            createStub.onFirstCall().returns(BluebirdPromise.reject({ statusCode: 409 }));
            createStub.onSecondCall().returns(BluebirdPromise.resolve({ id: 'myId' }));

            stubConfirmOverwrite();

            savedObject.lastSavedTitle = 'original title';
            savedObject.title = 'new title';
            return savedObject.save({ confirmOverwrite: true })
              .then(() => {
                expect(window.confirm.called).to.be(true);
                expect(savedObject.id).to.be('myId');
                expect(savedObject.isSaving).to.be(false);
                expect(savedObject.lastSavedTitle).to.be('new title');
                expect(savedObject.title).to.be('new title');
              });
          });
        });

        it('does not update on no response', function () {
          stubESResponse(getMockedDocResponse('HI'));
          return createInitializedSavedObject({ type: 'dashboard', id: 'HI' }).then(savedObject => {
            window.confirm = sinon.stub().returns(false);

            sinon.stub(savedObjectsClientStub, 'create').returns(BluebirdPromise.reject({ statusCode: 409 }));

            savedObject.lastSavedTitle = 'original title';
            savedObject.title = 'new title';
            return savedObject.save({ confirmOverwrite: true })
              .then(() => {
                expect(savedObject.id).to.be('HI');
                expect(savedObject.isSaving).to.be(false);
                expect(savedObject.lastSavedTitle).to.be('original title');
                expect(savedObject.title).to.be('new title');
              });
          });
        });

        it('handles create failures', function () {
          stubESResponse(getMockedDocResponse('myId'));
          return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(savedObject => {
            stubConfirmOverwrite();

            sinon.stub(savedObjectsClientStub, 'create').returns(BluebirdPromise.reject({ statusCode: 409 }));

            return savedObject.save({ confirmOverwrite: true })
              .then(() => {
                expect(true).to.be(false); // Force failure, the save should not succeed.
              })
              .catch(() => {
                expect(window.confirm.called).to.be(true);
              });
          });
        });
      });

      it('when false does not request overwrite', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);

        return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(savedObject => {
          stubConfirmOverwrite();

          sinon.stub(savedObjectsClientStub, 'create').returns(BluebirdPromise.resolve({ id: 'myId' }));

          return savedObject.save({ confirmOverwrite: false }).then(() => {
            expect(window.confirm.called).to.be(false);
          });
        });
      });
    });

    describe('with copyOnSave', function () {
      it('as true creates a copy on save success', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);
        return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(savedObject => {
          sinon.stub(savedObjectsClientStub, 'create', function () {
            return BluebirdPromise.resolve({ type: 'dashboard', id: 'newUniqueId' });
          });

          savedObject.copyOnSave = true;
          return savedObject.save().then((id) => {
            expect(id).to.be('newUniqueId');
          });
        });
      });

      it('as true does not create a copy when save fails', function () {
        const originalId = 'id1';
        const mockDocResponse = getMockedDocResponse(originalId);
        stubESResponse(mockDocResponse);
        return createInitializedSavedObject({ type: 'dashboard', id: originalId }).then(savedObject => {
          sinon.stub(savedObjectsClientStub, 'create', function () {
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
        const id = 'myId';
        const mockDocResponse = getMockedDocResponse(id);
        stubESResponse(mockDocResponse);

        return createInitializedSavedObject({ type: 'dashboard', id: id }).then(savedObject => {
          sinon.stub(savedObjectsClientStub, 'create', function () {
            expect(savedObject.id).to.be(id);
            return BluebirdPromise.resolve(id);
          });
          savedObject.copyOnSave = false;
          return savedObject.save().then((id) => {
            expect(id).to.be(id);
          });
        });
      });
    });

    it('returns id from server on success', function () {
      return createInitializedSavedObject({ type: 'dashboard' }).then(savedObject => {
        const mockDocResponse = getMockedDocResponse('myId');
        sinon.stub(savedObjectsClientStub, 'create', function () {
          return BluebirdPromise.resolve({ type: 'dashboard', id: 'myId', _version: 2 });
        });

        stubESResponse(mockDocResponse);
        return savedObject.save().then(id => {
          expect(id).to.be('myId');
        });
      });
    });

    describe('updates isSaving variable', function () {
      it('on success', function () {
        const id = 'id';
        stubESResponse(getMockedDocResponse(id));

        return createInitializedSavedObject({ type: 'dashboard', id: id }).then(savedObject => {
          sinon.stub(savedObjectsClientStub, 'create', () => {
            expect(savedObject.isSaving).to.be(true);
            return BluebirdPromise.resolve({
              type: 'dashboard', id, version: 2
            });
          });
          expect(savedObject.isSaving).to.be(false);
          return savedObject.save().then(() => {
            expect(savedObject.isSaving).to.be(false);
          });
        });
      });

      it('on failure', function () {
        stubESResponse(getMockedDocResponse('id'));
        return createInitializedSavedObject({ type: 'dashboard' }).then(savedObject => {
          sinon.stub(savedObjectsClientStub, 'create', () => {
            expect(savedObject.isSaving).to.be(true);
            return BluebirdPromise.reject();
          });
          expect(savedObject.isSaving).to.be(false);
          return savedObject.save().catch(() => {
            expect(savedObject.isSaving).to.be(false);
          });
        });
      });
    });
  });

  describe('applyESResp', function () {
    it('throws error if not found', function () {
      return createInitializedSavedObject({ type: 'dashboard' }).then(savedObject => {
        const response = {};
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
          const response = { found: true, _source: {} };
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
        { attributes: { dinosaurs: { tRex: 'is not so bad' }, } });
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

        stubESResponse({
          id: indexPatternId,
          type: 'dashboard',
          attributes: {
            title: 'testIndexPattern'
          },
          _version: 2
        });

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
        return {
          defaults: { testDefault: 'hi' },
          type: 'dashboard',
          ...extraOptions
        };
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
          { attributes: { overwriteMe: serverValue } });

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
