/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  resolveSavedObjects,
  resolveIndexPatternConflicts,
  saveObjects,
  saveObject,
} from './resolve_saved_objects';
import { SavedObject, SavedObjectLoader } from '../../../saved_objects/public';
import { IndexPatternsContract } from '../../../data/public';
import { dataPluginMock } from '../../../data/public/mocks';

class SavedObjectNotFound extends Error {
  constructor(options: Record<string, any>) {
    super();

    options.isSavedObjectNotFoundError = true;

    for (const option in options) {
      if (options.hasOwnProperty(option)) {
        (this as any)[option] = options[option];
      }
    }
  }
}

const openModalMock = jest.fn();

const createObj = (props: Partial<SavedObject>): SavedObject =>
  ({
    ...props,
  } as SavedObject);

describe('resolveSavedObjects', () => {
  describe('resolveSavedObjects', () => {
    it('should take in saved objects and spit out conflicts', async () => {
      const savedObjects = [
        {
          _type: 'search',
        },
        {
          _type: 'index-pattern',
          _id: '1',
          _source: {
            title: 'pattern',
            timeFieldName: '@timestamp',
          },
        },
        {
          _type: 'dashboard',
        },
        {
          _type: 'visualization',
        },
      ];

      const indexPatterns = {
        get: async () => {
          return {
            create: () => '2',
          };
        },
        create: async () => {
          return '2';
        },
        cache: {
          clear: () => {},
        },
      } as unknown as IndexPatternsContract;

      const services = [
        {
          type: 'search',
          get: async () => {
            return {
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'index-pattern',
                });
              },
            };
          },
        },
        {
          type: 'dashboard',
          get: async () => {
            return {
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'index-pattern',
                });
              },
            };
          },
        },
        {
          type: 'visualization',
          get: async () => {
            return {
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'index-pattern',
                });
              },
            };
          },
        },
      ] as unknown as SavedObjectLoader[];

      const overwriteAll = false;

      const result = await resolveSavedObjects(
        savedObjects,
        overwriteAll,
        services,
        indexPatterns,
        openModalMock
      );

      expect(result.conflictedIndexPatterns.length).toBe(3);
      expect(result.conflictedSavedObjectsLinkedToSavedSearches.length).toBe(0);
      expect(result.conflictedSearchDocs.length).toBe(0);
    });

    it('should bucket conflicts based on the type', async () => {
      const savedObjects = [
        {
          _type: 'search',
        },
        {
          _type: 'index-pattern',
          _id: '1',
          _source: {
            title: 'pattern',
            timeFieldName: '@timestamp',
          },
        },
        {
          _type: 'dashboard',
        },
        {
          _type: 'visualization',
        },
      ];

      const indexPatterns = {
        get: async () => {
          return {
            create: () => '2',
          };
        },
        create: async () => {
          return '2';
        },
        cache: {
          clear: () => {},
        },
      } as unknown as IndexPatternsContract;

      const services = [
        {
          type: 'search',
          get: async () => {
            return {
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'search',
                });
              },
            };
          },
        },
        {
          type: 'dashboard',
          get: async () => {
            return {
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'index-pattern',
                });
              },
            };
          },
        },
        {
          type: 'visualization',
          get: async () => {
            return {
              savedSearchId: '1',
              applyESResp: async () => {},
              save: async () => {
                throw new SavedObjectNotFound({
                  savedObjectType: 'index-pattern',
                });
              },
            };
          },
        },
      ] as unknown as SavedObjectLoader[];

      const overwriteAll = false;

      const result = await resolveSavedObjects(
        savedObjects,
        overwriteAll,
        services,
        indexPatterns,
        openModalMock
      );

      expect(result.conflictedIndexPatterns.length).toBe(1);
      expect(result.conflictedSavedObjectsLinkedToSavedSearches.length).toBe(1);
      expect(result.conflictedSearchDocs.length).toBe(1);
    });
  });

  describe('resolveIndexPatternConflicts', () => {
    let dependencies: Parameters<typeof resolveIndexPatternConflicts>[3];

    beforeEach(() => {
      const search = dataPluginMock.createStartContract().search;

      dependencies = {
        indexPatterns: {
          get: (id: string) => Promise.resolve({ id }),
        } as unknown as IndexPatternsContract,
        search,
      };
    });

    it('should resave resolutions', async () => {
      const save = jest.fn();

      const conflictedIndexPatterns = [
        {
          obj: {
            save,
          },
          doc: {
            _source: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: '1',
                }),
              },
            },
          },
        },
        {
          obj: {
            save,
          },
          doc: {
            _source: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: '3',
                }),
              },
            },
          },
        },
      ] as unknown as Array<{ obj: SavedObject; doc: any }>;

      const resolutions = [
        {
          oldId: '1',
          newId: '2',
        },
        {
          oldId: '3',
          newId: '4',
        },
        {
          oldId: '5',
          newId: '5',
        },
      ];

      const overwriteAll = false;

      await resolveIndexPatternConflicts(
        resolutions,
        conflictedIndexPatterns,
        overwriteAll,
        dependencies
      );

      expect(save.mock.calls.length).toBe(2);
      expect(save).toHaveBeenCalledWith({ confirmOverwrite: !overwriteAll });
    });

    it('should resolve filter index conflicts', async () => {
      const save = jest.fn();

      const conflictedIndexPatterns = [
        {
          obj: {
            save,
          },
          doc: {
            _source: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: '1',
                  filter: [{ meta: { index: 'filterIndex' } }],
                }),
              },
            },
          },
        },
        {
          obj: {
            save,
          },
          doc: {
            _source: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: '3',
                }),
              },
            },
          },
        },
      ] as unknown as Array<{ obj: SavedObject; doc: any }>;

      const resolutions = [
        {
          oldId: '1',
          newId: '2',
        },
        {
          oldId: '3',
          newId: '4',
        },
        {
          oldId: 'filterIndex',
          newId: 'newFilterIndex',
        },
      ];

      const overwriteAll = false;

      await resolveIndexPatternConflicts(
        resolutions,
        conflictedIndexPatterns,
        overwriteAll,
        dependencies
      );

      expect(save.mock.calls.length).toBe(2);
    });
  });

  describe('saveObjects', () => {
    it('should save every object', async () => {
      const save = jest.fn();

      const objs = [
        createObj({
          save,
        }),
        createObj({
          save,
        }),
      ];

      const overwriteAll = false;

      await saveObjects(objs, overwriteAll);
      expect(save.mock.calls.length).toBe(2);
      expect(save).toHaveBeenCalledWith({ confirmOverwrite: !overwriteAll });
    });
  });

  describe('saveObject', () => {
    it('should save the object', async () => {
      const save = jest.fn();
      const obj = createObj({
        save,
      });

      const overwriteAll = false;

      await saveObject(obj, overwriteAll);
      expect(save.mock.calls.length).toBe(1);
      expect(save).toHaveBeenCalledWith({ confirmOverwrite: !overwriteAll });
    });
  });
});
