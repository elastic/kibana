/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import { VIEW_MODE } from '../../common';
import { MODEL_VERSIONS, typeVersionGuesser } from './model_versions';
import type { SCHEMA_DISCOVER_SESSION_V13 } from './schema';
import { DISCOVER_SESSION_MODEL_VERSIONS } from './schema';
import type { SCHEMA_SEARCH_MODEL_VERSION_5 } from './schema_legacy';
import type { SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND } from './schema_legacy';
import { LEGACY_MODEL_VERSIONS } from './schema_legacy';

const createDocument = <T>(attributes: T): SavedObjectUnsanitizedDoc<T> => ({
  id: 'discover-session-id',
  type: 'search',
  attributes,
  references: [],
});

describe('model_versions', () => {
  describe('MODEL_VERSIONS', () => {
    it('should merge legacy and discover session model versions', () => {
      expect(MODEL_VERSIONS).toEqual({
        ...LEGACY_MODEL_VERSIONS,
        ...DISCOVER_SESSION_MODEL_VERSIONS,
      });
    });
  });

  describe('typeVersionGuesser', () => {
    it('should return the highest matching legacy version', () => {
      const attributes: TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5> = {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
        title: 'legacy title',
        sort: [],
        columns: [],
        description: '',
        grid: {},
        hideChart: false,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        isTextBasedQuery: false,
        timeRestore: false,
      };

      expect(typeVersionGuesser(createDocument(attributes))).toBe(12);
    });

    it('should return the legacy version for versionless v12 documents that already contain tabs', () => {
      const attributes: TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND> = {
        title: 'discover session',
        description: '',
        columns: [],
        sort: [],
        grid: {},
        hideChart: false,
        hideTable: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
        isTextBasedQuery: false,
        timeRestore: false,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        tabs: [
          {
            id: 'tab-1',
            label: 'Tab 1',
            attributes: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: '{}',
              },
              columns: [],
              sort: [],
              grid: {},
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: false,
              timeRestore: false,
            },
          },
        ],
      };

      expect(typeVersionGuesser(createDocument(attributes))).toBe(12);
    });

    it('should return the discover session version for v13 documents', () => {
      const attributes: TypeOf<typeof SCHEMA_DISCOVER_SESSION_V13> = {
        title: 'discover session',
        description: '',
        tabs: [
          {
            id: 'tab-1',
            label: 'Tab 1',
            attributes: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: '{}',
              },
              columns: [],
              sort: [],
              grid: {},
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: false,
              timeRestore: false,
            },
          },
        ],
      };

      expect(typeVersionGuesser(createDocument(attributes))).toBe(13);
    });

    it('should preserve the pre-guesser fallback by returning the latest version when no schema matches', () => {
      const document = createDocument({
        title: 'invalid document',
        description: '',
        tabs: [],
      });

      expect(typeVersionGuesser(document)).toBe(13);
    });
  });
});
