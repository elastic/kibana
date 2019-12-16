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

import {
  resolveSavedObjects,
  resolveIndexPatternConflicts,
  saveObjects,
  saveObject,
} from '../resolve_saved_objects';

jest.mock('../../../../../../../../../plugins/kibana_utils/public', () => ({
  SavedObjectNotFound: class SavedObjectNotFound extends Error {
    constructor(options) {
      super();
      for (const option in options) {
        if (options.hasOwnProperty(option)) {
          this[option] = options[option];
        }
      }
    }
  },
}));
import { SavedObjectNotFound } from '../../../../../../../../../plugins/kibana_utils/public';

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
      };

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
      ];

      const overwriteAll = false;

      const result = await resolveSavedObjects(savedObjects, overwriteAll, services, indexPatterns);

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
      };

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
      ];

      const overwriteAll = false;

      const result = await resolveSavedObjects(savedObjects, overwriteAll, services, indexPatterns);

      expect(result.conflictedIndexPatterns.length).toBe(1);
      expect(result.conflictedSavedObjectsLinkedToSavedSearches.length).toBe(1);
      expect(result.conflictedSearchDocs.length).toBe(1);
    });
  });

  describe('resolveIndexPatternConflicts', () => {
    it('should resave resolutions', async () => {
      const hydrateIndexPattern = jest.fn();
      const save = jest.fn();

      const conflictedIndexPatterns = [
        {
          obj: {
            searchSource: {
              getOwnField: field => {
                return field === 'index' ? '1' : undefined;
              },
            },
            hydrateIndexPattern,
            save,
          },
        },
        {
          obj: {
            searchSource: {
              getOwnField: field => {
                return field === 'index' ? '3' : undefined;
              },
            },
            hydrateIndexPattern,
            save,
          },
        },
      ];

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

      await resolveIndexPatternConflicts(resolutions, conflictedIndexPatterns, overwriteAll);
      expect(hydrateIndexPattern.mock.calls.length).toBe(2);
      expect(save.mock.calls.length).toBe(2);
      expect(save).toHaveBeenCalledWith({ confirmOverwrite: !overwriteAll });
      expect(hydrateIndexPattern).toHaveBeenCalledWith('2');
      expect(hydrateIndexPattern).toHaveBeenCalledWith('4');
    });

    it('should resolve filter index conflicts', async () => {
      const hydrateIndexPattern = jest.fn();
      const save = jest.fn();

      const conflictedIndexPatterns = [
        {
          obj: {
            searchSource: {
              getOwnField: field => {
                return field === 'index' ? '1' : [{ meta: { index: 'filterIndex' } }];
              },
              setField: jest.fn(),
            },
            hydrateIndexPattern,
            save,
          },
        },
        {
          obj: {
            searchSource: {
              getOwnField: field => {
                return field === 'index' ? '3' : undefined;
              },
            },
            hydrateIndexPattern,
            save,
          },
        },
      ];

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

      await resolveIndexPatternConflicts(resolutions, conflictedIndexPatterns, overwriteAll);

      expect(conflictedIndexPatterns[0].obj.searchSource.setField).toHaveBeenCalledWith('filter', [
        { meta: { index: 'newFilterIndex' } },
      ]);
      expect(save.mock.calls.length).toBe(2);
    });
  });

  describe('saveObjects', () => {
    it('should save every object', async () => {
      const save = jest.fn();

      const objs = [
        {
          save,
        },
        {
          save,
        },
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
      const obj = {
        save,
      };

      const overwriteAll = false;

      await saveObject(obj, overwriteAll);
      expect(save.mock.calls.length).toBe(1);
      expect(save).toHaveBeenCalledWith({ confirmOverwrite: !overwriteAll });
    });
  });
});
