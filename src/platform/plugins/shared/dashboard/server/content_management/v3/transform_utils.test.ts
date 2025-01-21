/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../../dashboard_saved_object';
import type { DashboardAttributes, DashboardItem } from './types';
import {
  dashboardAttributesOut,
  getResultV3ToV2,
  itemAttrsToSavedObjectAttrs,
  savedObjectToItem,
} from './transform_utils';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  ControlLabelPosition,
  ControlGroupChainingSystem,
  ControlWidth,
} from '@kbn/controls-plugin/common';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../common/content_management';

describe('dashboardAttributesOut', () => {
  const controlGroupInputControlsSo = {
    explicitInput: { anyKey: 'some value' },
    type: 'type1',
    order: 0,
  };

  const panelsSo: SavedDashboardPanel[] = [
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
  ];

  it('should set default values if not provided', () => {
    const input: DashboardSavedObjectAttributes = {
      controlGroupInput: {
        panelsJSON: JSON.stringify({ foo: controlGroupInputControlsSo }),
      },
      panelsJSON: JSON.stringify(panelsSo),
      optionsJSON: JSON.stringify({
        hidePanelTitles: false,
      }),
      kibanaSavedObjectMeta: {},
      title: 'my title',
      description: 'my description',
    };
    expect(dashboardAttributesOut(input)).toEqual<DashboardAttributes>({
      controlGroupInput: {
        chainingSystem: DEFAULT_CONTROL_CHAINING,
        labelPosition: DEFAULT_CONTROL_LABEL_POSITION,
        ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
        autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
        controls: [
          {
            controlConfig: { anyKey: 'some value' },
            grow: DEFAULT_CONTROL_GROW,
            id: 'foo',
            order: 0,
            type: 'type1',
            width: DEFAULT_CONTROL_WIDTH,
          },
        ],
      },
      description: 'my description',
      kibanaSavedObjectMeta: {},
      options: {
        ...DEFAULT_DASHBOARD_OPTIONS,
        hidePanelTitles: false,
      },
      panels: [
        {
          panelConfig: { enhancements: {} },
          gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
          id: '1',
          panelIndex: '1',
          panelRefName: 'ref1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ],
      timeRestore: false,
      title: 'my title',
    });
  });

  it('should transform full attributes correctly', () => {
    const input: DashboardSavedObjectAttributes = {
      controlGroupInput: {
        panelsJSON: JSON.stringify({
          foo: {
            ...controlGroupInputControlsSo,
            grow: false,
            width: 'small',
          },
        }),
        ignoreParentSettingsJSON: JSON.stringify({ ignoreFilters: true }),
        controlStyle: 'twoLine',
        chainingSystem: 'NONE',
        showApplySelections: true,
      },
      description: 'description',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: 'test', language: 'KQL' } }),
      },
      optionsJSON: JSON.stringify({
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      }),
      panelsJSON: JSON.stringify(panelsSo),
      refreshInterval: { pause: true, value: 1000 },
      timeFrom: 'now-15m',
      timeRestore: true,
      timeTo: 'now',
      title: 'title',
    };
    expect(dashboardAttributesOut(input)).toEqual<DashboardAttributes>({
      controlGroupInput: {
        chainingSystem: 'NONE',
        labelPosition: 'twoLine',
        ignoreParentSettings: {
          ignoreFilters: true,
          ignoreQuery: false,
          ignoreTimerange: false,
          ignoreValidations: false,
        },
        autoApplySelections: false,
        controls: [
          {
            controlConfig: {
              anyKey: 'some value',
            },
            id: 'foo',
            grow: false,
            width: 'small',
            order: 0,
            type: 'type1',
          },
        ],
      },
      description: 'description',
      kibanaSavedObjectMeta: {
        searchSource: { query: { query: 'test', language: 'KQL' } },
      },
      options: {
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      },
      panels: [
        {
          panelConfig: {
            enhancements: {},
          },
          gridData: {
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            i: '1',
          },
          id: '1',
          panelIndex: '1',
          panelRefName: 'ref1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ],
      refreshInterval: {
        pause: true,
        value: 1000,
      },
      timeFrom: 'now-15m',
      timeRestore: true,
      timeTo: 'now',
      title: 'title',
    });
  });
});

describe('itemAttrsToSavedObjectAttrs', () => {
  it('should transform item attributes to saved object attributes correctly', () => {
    const input: DashboardAttributes = {
      controlGroupInput: {
        chainingSystem: 'NONE',
        labelPosition: 'twoLine',
        controls: [
          {
            controlConfig: { anyKey: 'some value' },
            grow: false,
            id: 'foo',
            order: 0,
            type: 'type1',
            width: 'small',
          },
        ],
        ignoreParentSettings: {
          ignoreFilters: true,
          ignoreQuery: true,
          ignoreTimerange: true,
          ignoreValidations: true,
        },
        autoApplySelections: false,
      },
      description: 'description',
      kibanaSavedObjectMeta: { searchSource: { query: { query: 'test', language: 'KQL' } } },
      options: {
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      },
      panels: [
        {
          gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
          id: '1',
          panelConfig: { enhancements: {} },
          panelIndex: '1',
          panelRefName: 'ref1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ],
      timeRestore: true,
      title: 'title',
      refreshInterval: { pause: true, value: 1000 },
      timeFrom: 'now-15m',
      timeTo: 'now',
    };

    const output = itemAttrsToSavedObjectAttrs(input);
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "controlGroupInput": Object {
            "chainingSystem": "NONE",
            "controlStyle": "twoLine",
            "ignoreParentSettingsJSON": "{\\"ignoreFilters\\":true,\\"ignoreQuery\\":true,\\"ignoreTimerange\\":true,\\"ignoreValidations\\":true}",
            "panelsJSON": "{\\"foo\\":{\\"grow\\":false,\\"order\\":0,\\"type\\":\\"type1\\",\\"width\\":\\"small\\",\\"explicitInput\\":{\\"anyKey\\":\\"some value\\",\\"id\\":\\"foo\\"}}}",
            "showApplySelections": true,
          },
          "description": "description",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"query\\":{\\"query\\":\\"test\\",\\"language\\":\\"KQL\\"}}",
          },
          "optionsJSON": "{\\"hidePanelTitles\\":true,\\"useMargins\\":false,\\"syncColors\\":false,\\"syncTooltips\\":false,\\"syncCursor\\":false}",
          "panelsJSON": "[{\\"id\\":\\"1\\",\\"panelRefName\\":\\"ref1\\",\\"title\\":\\"title1\\",\\"type\\":\\"type1\\",\\"version\\":\\"2\\",\\"embeddableConfig\\":{\\"enhancements\\":{}},\\"panelIndex\\":\\"1\\",\\"gridData\\":{\\"x\\":0,\\"y\\":0,\\"w\\":10,\\"h\\":10,\\"i\\":\\"1\\"}}]",
          "refreshInterval": Object {
            "pause": true,
            "value": 1000,
          },
          "timeFrom": "now-15m",
          "timeRestore": true,
          "timeTo": "now",
          "title": "title",
        },
        "error": null,
      }
    `);
  });

  it('should handle missing optional attributes', () => {
    const input: DashboardAttributes = {
      title: 'title',
      description: 'my description',
      timeRestore: false,
      panels: [],
      options: DEFAULT_DASHBOARD_OPTIONS,
      kibanaSavedObjectMeta: {},
    };

    const output = itemAttrsToSavedObjectAttrs(input);
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "my description",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{}",
          },
          "optionsJSON": "{\\"hidePanelTitles\\":false,\\"useMargins\\":true,\\"syncColors\\":true,\\"syncCursor\\":true,\\"syncTooltips\\":true}",
          "panelsJSON": "[]",
          "timeRestore": false,
          "title": "title",
        },
        "error": null,
      }
    `);
  });
});

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
            panelConfig: { enhancements: {} },
            gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
            id: '1',
            panelIndex: '1',
            panelRefName: 'ref1',
            title: 'title1',
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
      references: undefined,
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
      expect(item?.references).toBeUndefined();
    }
  });
});

describe('getResultV3ToV2', () => {
  const commonAttributes = {
    description: 'description',
    refreshInterval: { pause: true, value: 1000 },
    timeFrom: 'now-15m',
    timeRestore: true,
    timeTo: 'now',
    title: 'title',
  };
  it('should transform a v3 result to a v2 result with all attributes', () => {
    const v3Result = {
      meta: { outcome: 'exactMatch' as const },
      item: {
        id: '1',
        type: 'dashboard',
        attributes: {
          ...commonAttributes,
          controlGroupInput: {
            chainingSystem: 'NONE' as ControlGroupChainingSystem,
            labelPosition: 'twoLine' as ControlLabelPosition,
            controls: [
              {
                controlConfig: { bizz: 'buzz' },
                grow: false,
                order: 0,
                id: 'foo',
                type: 'type1',
                width: 'small' as ControlWidth,
              },
            ],
            ignoreParentSettings: {
              ignoreFilters: true,
              ignoreQuery: true,
              ignoreTimerange: true,
              ignoreValidations: true,
            },
            autoApplySelections: false,
          },
          kibanaSavedObjectMeta: { searchSource: { query: { query: 'test', language: 'KQL' } } },
          options: {
            hidePanelTitles: true,
            useMargins: false,
            syncColors: false,
            syncCursor: false,
            syncTooltips: false,
          },
          panels: [
            {
              id: '1',
              type: 'visualization',
              panelConfig: { title: 'my panel' },
              gridData: { x: 0, y: 0, w: 15, h: 15, i: 'foo' },
              panelIndex: 'foo',
            },
          ],
        },
        references: [],
      },
    };

    const output = getResultV3ToV2(v3Result);

    // Common attributes should match between v2 and v3
    expect(output.item.attributes).toMatchObject(commonAttributes);
    expect(output.item.attributes.controlGroupInput).toMatchObject({
      chainingSystem: 'NONE',
      controlStyle: 'twoLine',
      showApplySelections: true,
    });

    // Check transformed attributes
    expect(output.item.attributes.controlGroupInput!.panelsJSON).toMatchInlineSnapshot(
      `"{\\"foo\\":{\\"grow\\":false,\\"order\\":0,\\"type\\":\\"type1\\",\\"width\\":\\"small\\",\\"explicitInput\\":{\\"bizz\\":\\"buzz\\",\\"id\\":\\"foo\\"}}}"`
    );
    expect(
      output.item.attributes.controlGroupInput!.ignoreParentSettingsJSON
    ).toMatchInlineSnapshot(
      `"{\\"ignoreFilters\\":true,\\"ignoreQuery\\":true,\\"ignoreTimerange\\":true,\\"ignoreValidations\\":true}"`
    );
    expect(output.item.attributes.kibanaSavedObjectMeta.searchSourceJSON).toMatchInlineSnapshot(
      `"{\\"query\\":{\\"query\\":\\"test\\",\\"language\\":\\"KQL\\"}}"`
    );
    expect(output.item.attributes.optionsJSON).toMatchInlineSnapshot(
      `"{\\"hidePanelTitles\\":true,\\"useMargins\\":false,\\"syncColors\\":false,\\"syncCursor\\":false,\\"syncTooltips\\":false}"`
    );
    expect(output.item.attributes.panelsJSON).toMatchInlineSnapshot(
      `"[{\\"id\\":\\"1\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{\\"title\\":\\"my panel\\"},\\"panelIndex\\":\\"foo\\",\\"gridData\\":{\\"x\\":0,\\"y\\":0,\\"w\\":15,\\"h\\":15,\\"i\\":\\"foo\\"}}]"`
    );
  });
});
