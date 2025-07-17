/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';

import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type { DashboardItem } from './types';

import { savedObjectToItem } from './transform_utils';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../common/content_management';

describe('savedObjectToItem', () => {
  const commonSavedObject: SavedObject = {
    references: [],
    id: '3d8459d9-0f1a-403d-aa82-6d93713a54b5',
    type: 'dashboard',
    attributes: {},
    version: 'WzEwLDFd',
    created_at: '2023-10-01T12:00:00Z',
    updated_at: '2023-10-01T12:00:00Z',
    updated_by: 'user1',
    created_by: 'user1',
    namespaces: ['default'],
  };

  const meta = {
    id: '3d8459d9-0f1a-403d-aa82-6d93713a54b5',
    type: 'dashboard',
    updatedAt: '2023-10-01T12:00:00Z',
    updatedBy: 'user1',
    createdAt: '2023-10-01T12:00:00Z',
    createdBy: 'user1',
  };

  const getSavedObjectForAttributes = (
    attributes: DashboardSavedObjectAttributes
  ): SavedObject<DashboardSavedObjectAttributes> => {
    return {
      ...commonSavedObject,
      attributes,
    };
  };

  const getTagNamesFromReferences = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should convert saved object to item with all attributes', () => {
    const input = getSavedObjectForAttributes({
      title: 'title',
      description: 'description',
      timeRestore: true,
      panelsJSON: JSON.stringify([
        {
          embeddableConfig: { enhancements: {} },
          gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
          id: '1',
          panelIndex: '1',
          panelRefName: 'ref1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ]),
      optionsJSON: JSON.stringify({
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"test","language":"KQL"}}',
      },
      version: 2,
    });

    const { item, error } = savedObjectToItem(input, false);
    expect(error).toBeNull();
    expect(item).toEqual<DashboardItem>({
      data: {
        description: 'description',
        kibanaSavedObjectMeta: {
          searchSource: {
            query: {
              query: 'test',
              language: 'KQL',
            },
          },
        },
        options: {
          hidePanelTitles: true,
          useMargins: false,
          syncColors: false,
          syncCursor: false,
          syncTooltips: false,
        },
        panels: [
          {
            gridData: {
              x: 0,
              y: 0,
              w: 10,
              h: 10,
              i: '1',
            },
            panelConfig: {
              enhancements: {},
              savedObjectId: '1',
              title: 'title1',
            },
            panelIndex: '1',
            panelRefName: 'ref1',
            type: 'type1',
            version: '2',
          },
        ],
        timeRestore: true,
        title: 'title',
        references: [],
        spaces: ['default'],
        version: 'WzEwLDFd',
      },
      meta,
    });
  });

  it('should pass references to getTagNamesFromReferences', () => {
    getTagNamesFromReferences.mockReturnValue(['tag1', 'tag2']);
    const input = {
      ...getSavedObjectForAttributes({
        title: 'dashboard with tags',
        description: 'I have some tags!',
        timeRestore: true,
        kibanaSavedObjectMeta: {},
        panelsJSON: JSON.stringify([]),
      }),
      references: [
        {
          type: 'tag',
          id: 'tag1',
          name: 'tag-ref-tag1',
        },
        {
          type: 'tag',
          id: 'tag2',
          name: 'tag-ref-tag2',
        },
        {
          type: 'index-pattern',
          id: 'index-pattern1',
          name: 'index-pattern-ref-index-pattern1',
        },
      ],
    };
    const { item, error } = savedObjectToItem(input, false, { getTagNamesFromReferences });
    expect(getTagNamesFromReferences).toHaveBeenCalledWith(input.references);
    expect(error).toBeNull();
    expect(item).toEqual({
      data: {
        description: 'I have some tags!',
        kibanaSavedObjectMeta: {},
        panels: [],
        tags: ['tag1', 'tag2'],
        timeRestore: true,
        title: 'dashboard with tags',
        references: [
          {
            type: 'tag',
            id: 'tag1',
            name: 'tag-ref-tag1',
          },
          {
            type: 'tag',
            id: 'tag2',
            name: 'tag-ref-tag2',
          },
          {
            type: 'index-pattern',
            id: 'index-pattern1',
            name: 'index-pattern-ref-index-pattern1',
          },
        ],
        spaces: ['default'],
        version: 'WzEwLDFd',
      },
      meta,
    });
  });

  it('should handle missing optional attributes', () => {
    const input = getSavedObjectForAttributes({
      title: 'title',
      description: 'description',
      timeRestore: false,
      panelsJSON: '[]',
      optionsJSON: '{}',
      kibanaSavedObjectMeta: {},
    });

    const { item, error } = savedObjectToItem(input, false);
    expect(error).toBeNull();
    expect(item).toEqual<DashboardItem>({
      data: {
        description: 'description',
        kibanaSavedObjectMeta: {},
        options: {
          ...DEFAULT_DASHBOARD_OPTIONS,
        },
        panels: [],
        timeRestore: false,
        title: 'title',
        references: [],
        spaces: ['default'],
        version: 'WzEwLDFd',
      },
      meta,
    });
  });

  it('should handle partial saved object', () => {
    const input = {
      ...commonSavedObject,
      references: undefined,
      attributes: {
        title: 'title',
        description: 'my description',
        timeRestore: false,
      },
    };

    const { item, error } = savedObjectToItem(input, true, {
      allowedAttributes: ['title', 'description'],
    });
    expect(error).toBeNull();
    expect(item).toEqual({
      data: {
        title: 'title',
        description: 'my description',
        spaces: ['default'],
        version: 'WzEwLDFd',
      },
      meta,
    });
  });

  it('should return an error if attributes can not be parsed', () => {
    const input = {
      ...commonSavedObject,
      references: undefined,
      attributes: {
        title: 'title',
        panelsJSON: 'not stringified json',
      },
    };
    const { item, error } = savedObjectToItem(input, true);
    expect(item).toBeNull();
    expect(error).not.toBe(null);
  });

  it('should include only requested references', () => {
    const input = {
      ...commonSavedObject,
      references: [
        {
          type: 'tag',
          id: 'tag1',
          name: 'tag-ref-tag1',
        },
        {
          type: 'index-pattern',
          id: 'index-pattern1',
          name: 'index-pattern-ref-index-pattern1',
        },
      ],
      attributes: {
        title: 'title',
        description: 'my description',
        timeRestore: false,
      },
    };

    {
      const { item: response } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
      });
      const data = response && 'data' in response ? response.data : undefined;
      expect(data?.references).toEqual(input.references);
    }

    {
      const { item: response } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: ['tag'],
      });
      const data = response && 'data' in response ? response.data : undefined;
      expect(data?.references).toEqual([input.references[0]]);
    }

    {
      const { item: response } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: [],
      });
      const data = response && 'data' in response ? response.data : undefined;
      expect(data?.references).toEqual([]);
    }

    {
      const { item: response } = savedObjectToItem({ ...input, references: undefined }, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: [],
      });
      const data = response && 'data' in response ? response.data : undefined;
      expect(data?.references).toBeUndefined();
    }
  });
});
