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

import Bluebird from 'bluebird';
import { createSavedObjectClass } from './saved_object';
import {
  SavedObject,
  SavedObjectConfig,
  SavedObjectKibanaServices,
  SavedObjectSaveOpts,
} from '../types';

// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
import { coreMock } from '../../../../core/public/mocks';
import { dataPluginMock, createSearchSourceMock } from '../../../../plugins/data/public/mocks';
import { SavedObjectAttributes, SimpleSavedObject } from 'kibana/public';
import { IIndexPattern } from '../../../data/common/index_patterns';

const getConfig = (cfg: any) => cfg;

describe('Saved Object', () => {
  const startMock = coreMock.createStart();
  const dataStartMock = dataPluginMock.createStartContract();
  const saveOptionsMock = {} as SavedObjectSaveOpts;
  const savedObjectsClientStub = startMock.savedObjects.client;

  let SavedObjectClass: new (config: SavedObjectConfig) => SavedObject;

  /**
   * Returns a fake doc response with the given index and id, of type dashboard
   * that can be used to stub es calls.
   * @param indexPatternId
   * @param additionalOptions - object that will be assigned to the mocked doc response.
   * @returns {{attributes: {}, type: string, id: *, _version: string}}
   */
  function getMockedDocResponse(indexPatternId: string, additionalOptions = {}) {
    return {
      type: 'dashboard',
      id: indexPatternId,
      _version: 'foo',
      attributes: {},
      ...additionalOptions,
    } as SimpleSavedObject<SavedObjectAttributes>;
  }

  /**
   * Stubs some of the es retrieval calls so it returns the given response.
   * @param {Object} mockDocResponse
   */
  function stubESResponse(mockDocResponse: SimpleSavedObject<SavedObjectAttributes>) {
    // Stub out search for duplicate title:
    savedObjectsClientStub.get = jest.fn().mockReturnValue(Bluebird.resolve(mockDocResponse));
    savedObjectsClientStub.update = jest.fn().mockReturnValue(Bluebird.resolve(mockDocResponse));

    savedObjectsClientStub.find = jest
      .fn()
      .mockReturnValue(Bluebird.resolve({ savedObjects: [], total: 0 }));

    savedObjectsClientStub.bulkGet = jest
      .fn()
      .mockReturnValue(Bluebird.resolve({ savedObjects: [mockDocResponse] }));
  }

  function stubSavedObjectsClientCreate(
    resp: SimpleSavedObject<SavedObjectAttributes> | string,
    resolve = true
  ) {
    savedObjectsClientStub.create = jest
      .fn()
      .mockReturnValue(resolve ? Bluebird.resolve(resp) : Bluebird.reject(resp));
  }

  /**
   * Creates a new saved object with the given configuration and initializes it.
   * Returns the promise that will be completed when the initialization finishes.
   *
   * @param {Object} config
   * @returns {Promise<SavedObject>} A promise that resolves with an instance of
   * SavedObject
   */
  function createInitializedSavedObject(config: SavedObjectConfig = {}) {
    const savedObject = new SavedObjectClass(config);
    savedObject.title = 'my saved object';

    return savedObject.init!();
  }

  beforeEach(() => {
    SavedObjectClass = createSavedObjectClass(({
      savedObjectsClient: savedObjectsClientStub,
      indexPatterns: dataStartMock.indexPatterns,
      search: {
        ...dataStartMock.search,
        searchSource: {
          ...dataStartMock.search.searchSource,
          create: createSearchSourceMock,
          createEmpty: createSearchSourceMock,
        },
      },
    } as unknown) as SavedObjectKibanaServices);
  });

  describe('save', () => {
    describe('with confirmOverwrite', () => {
      it('when false does not request overwrite', () => {
        stubESResponse(getMockedDocResponse('myId'));

        return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({ id: 'myId' } as SimpleSavedObject<
              SavedObjectAttributes
            >);

            return savedObject.save({ confirmOverwrite: false }).then(() => {
              expect(startMock.overlays.openModal).not.toHaveBeenCalled();
            });
          }
        );
      });
    });

    describe('with copyOnSave', () => {
      it('as true creates a copy on save success', () => {
        stubESResponse(getMockedDocResponse('myId'));

        return createInitializedSavedObject({ type: 'dashboard', id: 'myId' }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({
              type: 'dashboard',
              id: 'newUniqueId',
            } as SimpleSavedObject<SavedObjectAttributes>);
            savedObject.copyOnSave = true;

            return savedObject.save(saveOptionsMock).then((id) => {
              expect(id).toBe('newUniqueId');
            });
          }
        );
      });

      it('as true does not create a copy when save fails', () => {
        const originalId = 'id1';
        stubESResponse(getMockedDocResponse(originalId));

        return createInitializedSavedObject({ type: 'dashboard', id: originalId }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate('simulated error', false);
            savedObject.copyOnSave = true;

            return savedObject
              .save(saveOptionsMock)
              .then(() => {
                expect(false).toBe(true);
              })
              .catch(() => {
                expect(savedObject.id).toBe(originalId);
              });
          }
        );
      });

      it('as false does not create a copy', () => {
        const myId = 'myId';
        stubESResponse(getMockedDocResponse(myId));

        return createInitializedSavedObject({ type: 'dashboard', id: myId }).then((savedObject) => {
          savedObjectsClientStub.create = jest.fn().mockImplementation(() => {
            expect(savedObject.id).toBe(myId);
            return Bluebird.resolve({ id: myId });
          });
          savedObject.copyOnSave = false;

          return savedObject.save(saveOptionsMock).then((id) => {
            expect(id).toBe(myId);
          });
        });
      });
    });

    it('returns id from server on success', () => {
      return createInitializedSavedObject({ type: 'dashboard' }).then((savedObject) => {
        stubESResponse(getMockedDocResponse('myId'));
        stubSavedObjectsClientCreate({
          type: 'dashboard',
          id: 'myId',
          _version: 'foo',
        } as SimpleSavedObject<SavedObjectAttributes>);

        return savedObject.save(saveOptionsMock).then((id) => {
          expect(id).toBe('myId');
        });
      });
    });

    describe('updates isSaving variable', () => {
      it('on success', () => {
        const id = 'id';
        stubESResponse(getMockedDocResponse(id));

        return createInitializedSavedObject({ type: 'dashboard', id }).then((savedObject) => {
          savedObjectsClientStub.create = jest.fn().mockImplementation(() => {
            expect(savedObject.isSaving).toBe(true);
            return Bluebird.resolve({
              type: 'dashboard',
              id,
              _version: 'foo',
            });
          });

          expect(savedObject.isSaving).toBe(false);
          return savedObject.save(saveOptionsMock).then(() => {
            expect(savedObject.isSaving).toBe(false);
          });
        });
      });

      it('on failure', () => {
        stubESResponse(getMockedDocResponse('id'));
        return createInitializedSavedObject({ type: 'dashboard' }).then((savedObject) => {
          savedObjectsClientStub.create = jest.fn().mockImplementation(() => {
            expect(savedObject.isSaving).toBe(true);
            return Bluebird.reject('');
          });

          expect(savedObject.isSaving).toBe(false);
          return savedObject.save(saveOptionsMock).catch(() => {
            expect(savedObject.isSaving).toBe(false);
          });
        });
      });
    });

    describe('to extract references', () => {
      it('when "extractReferences" function when passed in', async () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        const extractReferences: SavedObjectConfig['extractReferences'] = ({
          attributes,
          references,
        }) => {
          references.push({
            name: 'test',
            type: 'index-pattern',
            id: 'my-index',
          });
          return { attributes, references };
        };
        return createInitializedSavedObject({ type: 'dashboard', extractReferences }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({
              id,
              _version: 'foo',
              type: 'dashboard',
            } as SimpleSavedObject<SavedObjectAttributes>);

            return savedObject.save(saveOptionsMock).then(() => {
              const { references } = (savedObjectsClientStub.create as jest.Mock).mock.calls[0][2];
              expect(references).toHaveLength(1);
              expect(references[0]).toEqual({
                name: 'test',
                type: 'index-pattern',
                id: 'my-index',
              });
            });
          }
        );
      });

      it('when search source references saved object', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({
              id,
              _version: '2',
              type: 'dashboard',
            } as SimpleSavedObject<SavedObjectAttributes>);

            const indexPattern = new StubIndexPattern(
              'my-index',
              getConfig,
              null,
              [],
              coreMock.createSetup()
            );
            indexPattern.title = indexPattern.id;
            savedObject.searchSource!.setField('index', indexPattern);
            return savedObject.save(saveOptionsMock).then(() => {
              const args = (savedObjectsClientStub.create as jest.Mock).mock.calls[0];
              expect(args[1]).toEqual({
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  }),
                },
              });

              expect(args[2].references).toHaveLength(1);
              expect(args[2].references[0]).toEqual({
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: 'my-index',
              });
            });
          }
        );
      });

      it('when index in searchSourceJSON is not found', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({
              id,
              _version: '2',
              type: 'dashboard',
            } as SimpleSavedObject<SavedObjectAttributes>);

            const indexPattern = new StubIndexPattern(
              'non-existant-index',
              getConfig,
              null,
              [],
              coreMock.createSetup()
            );
            savedObject.searchSource!.setFields({ index: indexPattern });
            return savedObject.save(saveOptionsMock).then(() => {
              const args = (savedObjectsClientStub.create as jest.Mock).mock.calls[0];
              expect(args[1]).toEqual({
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  }),
                },
              });
              expect(args[2].references).toHaveLength(1);
              expect(args[2].references[0]).toEqual({
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: 'non-existant-index',
              });
            });
          }
        );
      });

      it('when indexes exists in filter of searchSourceJSON', () => {
        const id = '123';
        stubESResponse(getMockedDocResponse(id));
        return createInitializedSavedObject({ type: 'dashboard', searchSource: true }).then(
          (savedObject) => {
            stubSavedObjectsClientCreate({
              id,
              _version: '2',
              type: 'dashboard',
            } as SimpleSavedObject<SavedObjectAttributes>);

            savedObject.searchSource!.setField('filter', [
              {
                meta: {
                  index: 'my-index',
                },
              },
            ] as any);
            return savedObject.save(saveOptionsMock).then(() => {
              const args = (savedObjectsClientStub.create as jest.Mock).mock.calls[0];
              expect(args[1]).toEqual({
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    filter: [
                      {
                        meta: {
                          indexRefName:
                            'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                        },
                      },
                    ],
                  }),
                },
              });
              expect(args[2].references).toHaveLength(1);
              expect(args[2].references[0]).toEqual({
                name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                type: 'index-pattern',
                id: 'my-index',
              });
            });
          }
        );
      });
    });
  });

  describe('applyESResp', () => {
    it('throws error if not found', () => {
      return createInitializedSavedObject({ type: 'dashboard' }).then((savedObject) => {
        const response = { _source: {} };
        try {
          savedObject.applyESResp(response);
          expect(true).toBe(false);
        } catch (err) {
          expect(!!err).toBe(true);
        }
      });
    });

    it('preserves original defaults if not overridden', () => {
      const id = 'anid';
      const preserveMeValue = 'here to stay!';
      const config = {
        defaults: {
          preserveMe: preserveMeValue,
        },
        type: 'dashboard',
        id,
      };

      const mockDocResponse = getMockedDocResponse(id);
      stubESResponse(mockDocResponse);

      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
        .then(() => {
          expect(savedObject._source.preserveMe).toEqual(preserveMeValue);
          const response = { found: true, _source: {} };
          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(savedObject._source.preserveMe).toEqual(preserveMeValue);
        });
    });

    it('overrides defaults', () => {
      const id = 'anid';
      const config = {
        defaults: {
          flower: 'rose',
        },
        type: 'dashboard',
        id,
      };

      stubESResponse(getMockedDocResponse(id));

      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
        .then(() => {
          expect(savedObject._source.flower).toEqual('rose');
          const response = {
            found: true,
            _source: {
              flower: 'orchid',
            },
          };
          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect(savedObject._source.flower).toEqual('orchid');
        });
    });

    it('overrides previous _source and default values', () => {
      const id = 'anid';
      const config = {
        defaults: {
          dinosaurs: {
            tRex: 'is the scariest',
          },
        },
        type: 'dashboard',
        id,
      };

      const mockDocResponse = getMockedDocResponse(id, {
        attributes: { dinosaurs: { tRex: 'is not so bad' } },
      });
      stubESResponse(mockDocResponse);

      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
        .then(() => {
          const response = {
            found: true,
            _source: { dinosaurs: { tRex: 'has big teeth' } },
          };

          return savedObject.applyESResp(response);
        })
        .then(() => {
          expect((savedObject._source as any).dinosaurs.tRex).toEqual('has big teeth');
        });
    });

    it('does not inject references when references array is missing', async () => {
      const injectReferences = jest.fn();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
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
          expect(injectReferences).not.toHaveBeenCalled();
        });
    });

    it('does not inject references when references array is empty', async () => {
      const injectReferences = jest.fn();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
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
          expect(injectReferences).not.toHaveBeenCalled();
        });
    });

    it('injects references when function is provided and references exist', async () => {
      const injectReferences = jest.fn();
      const config = {
        type: 'dashboard',
        injectReferences,
      };
      const savedObject = new SavedObjectClass(config);
      return savedObject.init!()
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
          expect(injectReferences).toHaveBeenCalledTimes(1);
        });
    });

    it('passes references to search source parsing function', async () => {
      SavedObjectClass = createSavedObjectClass(({
        savedObjectsClient: savedObjectsClientStub,
        indexPatterns: dataStartMock.indexPatterns,
        search: {
          ...dataStartMock.search,
        },
      } as unknown) as SavedObjectKibanaServices);
      const savedObject = new SavedObjectClass({ type: 'dashboard', searchSource: true });
      return savedObject.init!().then(async () => {
        const searchSourceJSON = JSON.stringify({
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          filter: [
            {
              meta: {
                indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
              },
            },
          ],
        });
        const response = {
          found: true,
          _source: {
            kibanaSavedObjectMeta: {
              searchSourceJSON,
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
        await savedObject.applyESResp(response);
        expect(dataStartMock.search.searchSource.create).toBeCalledWith({
          filter: [{ meta: { index: 'my-index-2' } }],
          index: 'my-index-1',
        });
      });
    });
  });

  describe('config', () => {
    it('afterESResp is called', () => {
      const afterESRespCallback = jest.fn();
      const config = {
        type: 'dashboard',
        afterESResp: afterESRespCallback,
      };

      return createInitializedSavedObject(config).then(() => {
        expect(afterESRespCallback).toHaveBeenCalled();
      });
    });

    describe('searchSource', () => {
      it('when true, creates index', () => {
        const indexPatternId = 'testIndexPattern';
        const afterESRespCallback = jest.fn();

        const config: SavedObjectConfig = {
          type: 'dashboard',
          afterESResp: afterESRespCallback,
          searchSource: true,
          indexPattern: { id: indexPatternId } as IIndexPattern,
        };

        stubESResponse(
          getMockedDocResponse(indexPatternId, {
            attributes: {
              title: 'testIndexPattern',
            },
          })
        );

        const savedObject = new SavedObjectClass(config);
        savedObject.hydrateIndexPattern = jest.fn().mockImplementation(() => {
          const indexPattern = new StubIndexPattern(
            indexPatternId,
            getConfig,
            null,
            [],
            coreMock.createSetup()
          );
          indexPattern.title = indexPattern.id;
          savedObject.searchSource!.setField('index', indexPattern);
          return Bluebird.resolve(indexPattern);
        });
        expect(!!savedObject.searchSource!.getField('index')).toBe(false);

        return savedObject.init!().then(() => {
          expect(afterESRespCallback).toHaveBeenCalled();
          const index = savedObject.searchSource!.getField('index');
          expect(index instanceof StubIndexPattern).toBe(true);
          expect(index!.id).toEqual(indexPatternId);
        });
      });

      it('when false, does not create index', () => {
        const indexPatternId = 'testIndexPattern';
        const afterESRespCallback = jest.fn();

        const config: SavedObjectConfig = {
          type: 'dashboard',
          afterESResp: afterESRespCallback,
          searchSource: false,
          indexPattern: { id: indexPatternId } as IIndexPattern,
        };

        stubESResponse(getMockedDocResponse(indexPatternId));

        const savedObject = new SavedObjectClass(config);
        expect(!!savedObject.searchSource).toBe(false);

        return savedObject.init!().then(() => {
          expect(afterESRespCallback).toHaveBeenCalled();
          expect(!!savedObject.searchSource).toBe(false);
        });
      });
    });

    describe('type', () => {
      it('that is not specified throws an error', (done) => {
        const config = {};

        const savedObject = new SavedObjectClass(config);
        savedObject.init!().catch(() => {
          done();
        });
      });

      it('that is invalid invalid throws an error', () => {
        const config = { type: 'notypeexists' };

        const savedObject = new SavedObjectClass(config);
        try {
          savedObject.init!();
          expect(false).toBe(true);
        } catch (err) {
          expect(err).not.toBeNull();
        }
      });

      it('that is valid passes', () => {
        const config = { type: 'dashboard' };
        return new SavedObjectClass(config).init!();
      });
    });

    describe('defaults', () => {
      function getTestDefaultConfig(extraOptions: object = {}) {
        return {
          defaults: { testDefault: 'hi' },
          type: 'dashboard',
          ...extraOptions,
        };
      }

      function expectDefaultApplied(config: SavedObjectConfig) {
        return createInitializedSavedObject(config).then((savedObject) => {
          expect(savedObject.defaults).toBe(config.defaults);
        });
      }

      describe('applied to object when id', () => {
        it('is not specified', () => {
          expectDefaultApplied(getTestDefaultConfig());
        });

        it('is undefined', () => {
          expectDefaultApplied(getTestDefaultConfig({ id: undefined }));
        });

        it('is 0', () => {
          expectDefaultApplied(getTestDefaultConfig({ id: 0 }));
        });

        it('is false', () => {
          expectDefaultApplied(getTestDefaultConfig({ id: false }));
        });
      });

      it('applied to source if an id is given', () => {
        const myId = 'myid';
        const customDefault = 'hi';
        const initialOverwriteMeValue = 'this should get overwritten by the server response';

        const config = {
          defaults: {
            overwriteMe: initialOverwriteMeValue,
            customDefault,
          },
          type: 'dashboard',
          id: myId,
        };

        const serverValue = 'this should override the initial default value given';

        const mockDocResponse = getMockedDocResponse(myId, {
          attributes: { overwriteMe: serverValue },
        });

        stubESResponse(mockDocResponse);

        return createInitializedSavedObject(config).then((savedObject) => {
          expect(!!savedObject._source).toBe(true);
          expect(savedObject.defaults).toBe(config.defaults);
          expect(savedObject._source.overwriteMe).toBe(serverValue);
          expect(savedObject._source.customDefault).toBe(customDefault);
        });
      });
    });
  });
});
