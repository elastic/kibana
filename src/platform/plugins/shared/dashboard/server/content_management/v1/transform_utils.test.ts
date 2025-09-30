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
  };

  const getSavedObjectForAttributes = (
    attributes: DashboardSavedObjectAttributes
  ): SavedObject<DashboardSavedObjectAttributes> => {
    return {
      ...commonSavedObject,
      attributes,
    };
  };

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
    });

    const { item, error } = savedObjectToItem(input, false);
    expect(error).toBeNull();
    expect(item).toEqual<DashboardItem>({
      ...commonSavedObject,
      attributes: {
        title: 'title',
        description: 'description',
        timeRestore: true,
        panels: [
          {
            config: {
              enhancements: {},
              savedObjectId: '1',
              title: 'title1',
            },
            grid: { x: 0, y: 0, w: 10, h: 10, i: '1' },
            uid: '1',
            type: 'type1',
            version: '2',
          },
        ],
        options: {
          hidePanelTitles: true,
          useMargins: false,
          syncColors: false,
          syncTooltips: false,
          syncCursor: false,
        },
        kibanaSavedObjectMeta: {
          searchSource: { query: { query: 'test', language: 'KQL' } },
        },
      },
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
      ...commonSavedObject,
      attributes: {
        title: 'title',
        description: 'description',
        timeRestore: false,
        panels: [],
        options: DEFAULT_DASHBOARD_OPTIONS,
        kibanaSavedObjectMeta: {},
      },
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
      ...commonSavedObject,
      references: [],
      attributes: {
        title: 'title',
        description: 'my description',
      },
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
      const { item } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
      });
      expect(item?.references).toEqual(input.references);
    }

    {
      const { item } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: ['tag'],
      });
      expect(item?.references).toEqual([input.references[0]]);
    }

    {
      const { item } = savedObjectToItem(input, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: [],
      });
      expect(item?.references).toEqual([]);
    }

    {
      const { item } = savedObjectToItem({ ...input, references: undefined }, true, {
        allowedAttributes: ['title', 'description'],
        allowedReferences: [],
      });
      expect(item?.references).toEqual([]);
    }
  });
});
