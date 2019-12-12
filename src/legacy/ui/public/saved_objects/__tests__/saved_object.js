/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';
import Bluebird from 'bluebird';

import { createSavedObjectClass } from '../saved_object';
import StubIndexPattern from 'test_utils/stub_index_pattern';
import { SavedObjectsClientProvider } from '../saved_objects_client_provider';
import { InvalidJSONProperty } from '../../../../../plugins/kibana_utils/public';
import { mockUiSettings } from '../../new_platform/new_platform.karma_mock';

const getConfig = cfg => cfg;

describe('Saved Object', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let SavedObject;
  let esDataStub;
  let savedObjectsClientStub;
  let window;

  /**
   * Returns a fake doc response with the given index and id, of type dashboard
   * that can be used to stub es calls.
   * @param indexPatternId
   * @param additionalOptions - object that will be assigned to the mocked doc response.
   * @returns {{attributes: {}, type: string, id: *, _version: string}}
   */
  function getMockedDocResponse(indexPatternId, additionalOptions = {}) {
    return {
      type: 'dashboard',
      id: indexPatternId,
      _version: 'foo',
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
    sinon.stub(savedObjectsClientStub, 'get').returns(Bluebird.resolve(mockDocResponse));
    sinon.stub(savedObjectsClientStub, 'update').returns(Bluebird.resolve(mockDocResponse));

    sinon.stub(savedObjectsClientStub, 'find').returns(Bluebird.resolve({ savedObjects: [], total: 0 }));
    sinon.stub(savedObjectsClientStub, 'bulkGet').returns(Bluebird.resolve({ savedObjects: [mockDocResponse] }));
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

  const mock409FetchError = {
    res: { status: 409 }
  };

  beforeEach(ngMock.module(
    'kibana',
    // Use the native window.confirm instead of our specialized version to make testing
    // this easier.
    function ($provide) {
      const overrideConfirm = message => window.confirm(message) ? Promise.resolve() : Promise.reject();
      $provide.decorator('confirmModalPromise', () => overrideConfirm);
    })
  );

  beforeEach(ngMock.inject(function (es, Private, $window) {
    savedObjectsClientStub = Private(SavedObjectsClientProvider);
    SavedObject = createSavedObjectClass({ savedObjectsClient: savedObjectsClientStub });
    esDataStub = es;
    window = $window;
  }));

  describe('save', function () {
    describe('with confirmOverwrite', function () {
      function stubConfirmOverwrite() {
        window.confirm = sinon.stub().returns(true);
        sinon.stub(esDataStub, 'create').returns(Bluebird.reject(mock409FetchError));
      }

      it('when false does not request overwrite', function () {
        const mockDocResponse = getMockedDocResponse('myId');
        stubESResponse(mockDocResponse);

        return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(savedObject => {
          stubConfirmOverwrite();

          sinon.stub(savedObjectsClientStub, 'create').returns(Bluebird.resolve({ id: 'myId' }));

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
          sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
            return Bluebird.resolve({ type: 'dashboard', id: 'newUniqueId' });
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
          sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
            return Bluebird.reject('simulated error');
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
          sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
            expect(savedObject.id).to.be(id);
            return Bluebird.resolve(id);
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
        sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
          return Bluebird.resolve({
            type: 'dashboard',
            id: 'myId',
            _version: 'foo'
          });
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
          sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
            expect(savedObject.isSaving).to.be(true);
            return Bluebird.resolve({
              type: 'dashboard',
              id,
              version: 'foo'
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
          sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
            expect(savedObject.isSaving).to.be(true);
            return Bluebird.reject();
          });
          expect(savedObject.isSaving).to.be(false);
          return savedObject.save().catch(() => {
            expect(savedObject.isSaving).to.be(false);
          });
        });
      });
    });

    describe('to extract references', () => {
      it('when "extractReferences" function when passed in', async () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        const extractReferences = ({ attributes, references }) => {
          references.push({
            name: 'test',
            type: 'index-pattern',
            id: 'my-index',
          });
          return { attributes, references };
        };
        return createInitializedSavedObject({ type: 'dashboard', extractReferences })
          .then((savedObject) => {
            sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
              return Bluebird.resolve({
                id,
                version: 'foo',
                type: 'dashboard',
              });
            });
            return savedObject
              .save()
              .then(() => {
                const { references } = savedObjectsClientStub.create.getCall(0).args[2];
                expect(references).to.have.length(1);
                expect(references[0]).to.eql({
                  name: 'test',
                  type: 'index-pattern',
                  id: 'my-index',
                });
              });
          });
      });

      it('when index exists in searchSourceJSON', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true })
          .then((savedObject) => {
            sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
              return Bluebird.resolve({
                id,
                version: 2,
                type: 'dashboard',
              });
            });
            const indexPattern = new StubIndexPattern('my-index', getConfig, null, [], mockUiSettings);
            indexPattern.title = indexPattern.id;
            savedObject.searchSource.setField('index', indexPattern);
            return savedObject
              .save()
              .then(() => {
                expect(savedObjectsClientStub.create.getCall(0).args[1]).to.eql({
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                    }),
                  },
                });
                const { references } = savedObjectsClientStub.create.getCall(0).args[2];
                expect(references).to.have.length(1);
                expect(references[0]).to.eql({
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  type: 'index-pattern',
                  id: 'my-index',
                });
              });
          });
      });

      it('when index in searchSourceJSON is not found', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true })
          .then((savedObject) => {
            sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
              return Bluebird.resolve({
                id,
                version: 2,
                type: 'dashboard',
              });
            });
            savedObject.searchSource.setFields({ 'index': 'non-existant-index' });
            return savedObject
              .save()
              .then(() => {
                expect(savedObjectsClientStub.create.getCall(0).args[1]).to.eql({
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                    }),
                  },
                });
                const { references } = savedObjectsClientStub.create.getCall(0).args[2];
                expect(references).to.have.length(1);
                expect(references[0]).to.eql({
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  type: 'index-pattern',
                  id: 'non-existant-index',
                });
              });
          });
      });

      it('when indexes exists in filter of searchSourceJSON', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true })
          .then((savedObject) => {
            sinon.stub(savedObjectsClientStub, 'create').callsFake(() => {
              return Bluebird.resolve({
                id,
                version: 2,
                type: 'dashboard',
              });
            });
            savedObject.searchSource.setField('filter', [{
              meta: {
                index: 'my-index',
              }
            }]);
            return savedObject
              .save()
              .then(() => {
                expect(savedObjectsClientStub.create.getCall(0).args[1]).to.eql({
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      filter: [
                        {
                          meta: {
                            indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                          }
                        }
                      ],
                    }),
                  },
                });
                const { references } = savedObjectsClientStub.create.getCall(0).args[2];
                expect(references).to.have.length(1);
                expect(references[0]).to.eql({
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                  type: 'index-pattern',
                  id: 'my-index',
                });
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

    it('throws error invalid JSON is detected', async function () {
      const savedObject = await createInitializedSavedObject({ type: 'dashboard', searchSource: true });
      const response = {
        found: true,
        _source: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: '\"{\\n  \\\"filter\\\": []\\n}\"'
          }
        }
      };

      try {
        await savedObject.applyESResp(response);
        throw new Error('applyESResp should have failed, but did not.');
      } catch (err) {
        expect(err instanceof InvalidJSONProperty).to.be(true);
      }
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

    it('does not inject references when references array is missing', async () => {
      const injectReferences = sinon.stub();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          const response = {
            found: true,
            _source: {
              dinosaurs: { tRex: 'has big teeth' },
            },
          };
          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(injectReferences).to.have.property('notCalled', true);
        });
    });

    it('does not inject references when references array is empty', async () => {
      const injectReferences = sinon.stub();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          const response = {
            found: true,
            _source: {
              dinosaurs: { tRex: 'has big teeth' },
            },
            references: [],
          };
          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(injectReferences).to.have.property('notCalled', true);
        });
    });

    it('injects references when function is provided and references exist', async () => {
      const injectReferences = sinon.stub();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObject(config);
      return savedObject.init()
        .then(() => {
          const response = {
            found: true,
            _source: {
              dinosaurs: { tRex: 'has big teeth' },
            },
            references: [{}],
          };
          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(injectReferences).to.have.property('calledOnce', true);
        });
    });

    it('injects references from searchSourceJSON', async () => {
      const savedObject = new SavedObject({ type: 'dashboard', searchSource: true });
      return savedObject
        .init()
        .then(() => {
          const response = {
            found: true,
            _source: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  filter: [
                    {
                      meta: {
                        indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                      },
                    },
                  ],
                }),
              },
            },
            references: [
              {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: 'my-index-1',
              },
              {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                type: 'index-pattern',
                id: 'my-index-2',
              },
            ],
          };
          savedObject.applyESResp(response);
          expect(savedObject.searchSource.getFields()).to.eql({
            index: 'my-index-1',
            filter: [
              {
                meta: {
                  index: 'my-index-2',
                },
              },
            ],
          });
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
          _version: 'foo'
        });

        const savedObject = new SavedObject(config);
        sinon.stub(savedObject, 'hydrateIndexPattern').callsFake(() => {
          const indexPattern = new StubIndexPattern(indexPatternId, getConfig, null, [], mockUiSettings);
          indexPattern.title = indexPattern.id;
          savedObject.searchSource.setField('index', indexPattern);
          return Promise.resolve(indexPattern);
        });
        expect(!!savedObject.searchSource.getField('index')).to.be(false);

        return savedObject.init().then(() => {
          expect(afterESRespCallback.called).to.be(true);
          const index = savedObject.searchSource.getField('index');
          expect(index instanceof StubIndexPattern).to.be(true);
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
