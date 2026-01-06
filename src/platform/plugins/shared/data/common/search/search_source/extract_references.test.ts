/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractReferences } from './extract_references';
import type { SerializedSearchSourceFields } from './types';

describe('extractReferences', () => {
  it('should extract reference for data view ID', () => {
    const searchSource: SerializedSearchSourceFields = {
      index: 'test-index',
    };
    const result = extractReferences(searchSource);
    expect(result).toEqual([
      {
        indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      },
      [
        {
          id: 'test-index',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
      ],
    ]);
  });

  it('should not extract reference for data view spec', () => {
    const searchSource: SerializedSearchSourceFields = {
      index: {
        id: 'test-id',
        title: 'test-title',
      },
    };
    const result = extractReferences(searchSource);
    expect(result).toEqual([
      {
        index: {
          id: 'test-id',
          title: 'test-title',
        },
      },
      [],
    ]);
  });

  it('should extract reference for filter', () => {
    const searchSource: SerializedSearchSourceFields = {
      filter: [
        {
          meta: {
            index: 'test-index',
          },
        },
      ],
    };
    const result = extractReferences(searchSource);
    expect(result).toEqual([
      {
        filter: [
          {
            meta: {
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
            },
          },
        ],
      },
      [
        {
          id: 'test-index',
          name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
          type: 'index-pattern',
        },
      ],
    ]);
  });

  it('should apply prefix to references', () => {
    const searchSource: SerializedSearchSourceFields = {
      index: 'test-index',
      filter: [
        {
          meta: {
            index: 'test-index',
          },
        },
      ],
    };
    const result = extractReferences(searchSource, { refNamePrefix: 'testPrefix' });
    expect(result).toEqual([
      {
        indexRefName: 'testPrefix.kibanaSavedObjectMeta.searchSourceJSON.index',
        filter: [
          {
            meta: {
              indexRefName:
                'testPrefix.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
            },
          },
        ],
      },
      [
        {
          id: 'test-index',
          name: 'testPrefix.kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
        {
          id: 'test-index',
          name: 'testPrefix.kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
          type: 'index-pattern',
        },
      ],
    ]);
  });
});
