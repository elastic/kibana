/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  extractReferences,
  injectReferences,
  InjectExtractDeps,
} from './dashboard_saved_object_references';

import {
  createExtract,
  createInject,
} from '../../dashboard_container/persistable_state/dashboard_container_references';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';
import type { DashboardAttributes, DashboardItem } from '../../../server/content_management';
import { DashboardAttributesAndReferences } from '../../types';

const embeddablePersistableStateServiceMock = createEmbeddablePersistableStateServiceMock();
const dashboardInject = createInject(embeddablePersistableStateServiceMock);
const dashboardExtract = createExtract(embeddablePersistableStateServiceMock);

embeddablePersistableStateServiceMock.extract.mockImplementation((state) => {
  if (state.type === 'dashboard') {
    return dashboardExtract(state);
  }

  return { state, references: [] };
});

embeddablePersistableStateServiceMock.inject.mockImplementation((state, references) => {
  if (state.type === 'dashboard') {
    return dashboardInject(state, references);
  }

  return state;
});
const deps: InjectExtractDeps = {
  embeddablePersistableStateService: embeddablePersistableStateServiceMock,
};

const commonAttributes: DashboardAttributes = {
  kibanaSavedObjectMeta: { searchSource: {} },
  timeRestore: false,
  version: 1,
  options: {
    hidePanelTitles: false,
    useMargins: true,
    syncColors: true,
    syncCursor: true,
    syncTooltips: true,
  },
  panels: [],
  description: '',
  title: '',
};

describe('extractReferences', () => {
  test('extracts references from panels', () => {
    const doc = {
      id: '1',
      attributes: {
        ...commonAttributes,
        foo: true,
        panels: [
          {
            panelIndex: 'panel-1',
            type: 'visualization',
            id: '1',
            title: 'Title 1',
            version: '7.9.1',
            gridData: { x: 0, y: 0, w: 1, h: 1, i: 'panel-1' },
            panelConfig: {},
          },
          {
            panelIndex: 'panel-2',
            type: 'visualization',
            id: '2',
            title: 'Title 2',
            version: '7.9.1',
            gridData: { x: 1, y: 1, w: 2, h: 2, i: 'panel-2' },
            panelConfig: {},
          },
        ],
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc, deps);

    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "",
          "foo": true,
          "kibanaSavedObjectMeta": Object {
            "searchSource": Object {},
          },
          "options": Object {
            "hidePanelTitles": false,
            "syncColors": true,
            "syncCursor": true,
            "syncTooltips": true,
            "useMargins": true,
          },
          "panels": Array [
            Object {
              "gridData": Object {
                "h": 1,
                "i": "panel-1",
                "w": 1,
                "x": 0,
                "y": 0,
              },
              "panelConfig": Object {},
              "panelIndex": "panel-1",
              "panelRefName": "panel_panel-1",
              "title": "Title 1",
              "type": "visualization",
              "version": "7.9.1",
            },
            Object {
              "gridData": Object {
                "h": 2,
                "i": "panel-2",
                "w": 2,
                "x": 1,
                "y": 1,
              },
              "panelConfig": Object {},
              "panelIndex": "panel-2",
              "panelRefName": "panel_panel-2",
              "title": "Title 2",
              "type": "visualization",
              "version": "7.9.1",
            },
          ],
          "timeRestore": false,
          "title": "",
          "version": 1,
        },
        "references": Array [
          Object {
            "id": "1",
            "name": "panel-1:panel_panel-1",
            "type": "visualization",
          },
          Object {
            "id": "2",
            "name": "panel-2:panel_panel-2",
            "type": "visualization",
          },
        ],
      }
    `);
  });

  test('fails when "type" attribute is missing from a panel', () => {
    const doc = {
      id: '1',
      attributes: {
        ...commonAttributes,
        foo: true,
        panels: [
          {
            id: '1',
            title: 'Title 1',
            version: '7.9.1',
          },
        ],
      },
      references: [],
    } as unknown as DashboardAttributesAndReferences;
    expect(() => extractReferences(doc, deps)).toThrowErrorMatchingInlineSnapshot(
      `"\\"type\\" attribute is missing from panel \\"0\\""`
    );
  });

  test('passes when "id" attribute is missing from a panel', () => {
    const doc = {
      id: '1',
      attributes: {
        ...commonAttributes,
        foo: true,
        panels: [
          {
            type: 'visualization',
            title: 'Title 1',
            version: '7.9.1',
            gridData: { x: 0, y: 0, w: 1, h: 1, i: 'panel-1' },
            panelConfig: {},
          },
        ],
      },
      references: [],
    };
    expect(extractReferences(doc as unknown as DashboardItem, deps)).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "",
          "foo": true,
          "kibanaSavedObjectMeta": Object {
            "searchSource": Object {},
          },
          "options": Object {
            "hidePanelTitles": false,
            "syncColors": true,
            "syncCursor": true,
            "syncTooltips": true,
            "useMargins": true,
          },
          "panels": Array [
            Object {
              "gridData": Object {
                "h": 1,
                "i": "panel-1",
                "w": 1,
                "x": 0,
                "y": 0,
              },
              "panelConfig": Object {},
              "panelIndex": "0",
              "title": "Title 1",
              "type": "visualization",
              "version": "7.9.1",
            },
          ],
          "timeRestore": false,
          "title": "",
          "version": 1,
        },
        "references": Array [],
      }
    `);
  });
});

describe('injectReferences', () => {
  test('returns injected attributes', () => {
    const attributes = {
      ...commonAttributes,
      id: '1',
      title: 'test',
      panels: [
        {
          type: 'visualization',
          panelRefName: 'panel_0',
          panelIndex: '0',
          title: 'Title 1',
          version: '7.9.0',
          gridData: { x: 0, y: 0, w: 1, h: 1, i: '0' },
          panelConfig: {},
        },
        {
          type: 'visualization',
          panelRefName: 'panel_1',
          panelIndex: '1',
          title: 'Title 2',
          version: '7.9.0',
          gridData: { x: 1, y: 1, w: 2, h: 2, i: '1' },
          panelConfig: {},
        },
      ],
    };
    const references = [
      {
        name: 'panel_0',
        type: 'visualization',
        id: '1',
      },
      {
        name: 'panel_1',
        type: 'visualization',
        id: '2',
      },
    ];
    const newAttributes = injectReferences({ attributes, references }, deps);

    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "description": "",
        "id": "1",
        "kibanaSavedObjectMeta": Object {
          "searchSource": Object {},
        },
        "options": Object {
          "hidePanelTitles": false,
          "syncColors": true,
          "syncCursor": true,
          "syncTooltips": true,
          "useMargins": true,
        },
        "panels": Array [
          Object {
            "gridData": Object {
              "h": 1,
              "i": "0",
              "w": 1,
              "x": 0,
              "y": 0,
            },
            "id": "1",
            "panelConfig": Object {},
            "panelIndex": "0",
            "title": "Title 1",
            "type": "visualization",
            "version": "7.9.0",
          },
          Object {
            "gridData": Object {
              "h": 2,
              "i": "1",
              "w": 2,
              "x": 1,
              "y": 1,
            },
            "id": "2",
            "panelConfig": Object {},
            "panelIndex": "1",
            "title": "Title 2",
            "type": "visualization",
            "version": "7.9.0",
          },
        ],
        "timeRestore": false,
        "title": "test",
        "version": 1,
      }
    `);
  });

  test('skips when panels is missing', () => {
    const attributes = {
      id: '1',
      title: 'test',
    } as unknown as DashboardAttributes;
    const newAttributes = injectReferences({ attributes, references: [] }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "panels": Array [],
        "title": "test",
      }
    `);
  });

  test('skips a panel when panelRefName is missing', () => {
    const attributes = {
      ...commonAttributes,
      id: '1',
      title: 'test',
      panels: [
        {
          type: 'visualization',
          panelRefName: 'panel_0',
          panelIndex: '0',
          title: 'Title 1',
          gridData: { x: 0, y: 0, w: 1, h: 1, i: '0' },
          panelConfig: {},
        },
        {
          type: 'visualization',
          panelIndex: '1',
          title: 'Title 2',
          gridData: { x: 1, y: 1, w: 2, h: 2, i: '1' },
          panelConfig: {},
        },
      ],
    };
    const references = [
      {
        name: 'panel_0',
        type: 'visualization',
        id: '1',
      },
    ];
    const newAttributes = injectReferences({ attributes, references }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "description": "",
        "id": "1",
        "kibanaSavedObjectMeta": Object {
          "searchSource": Object {},
        },
        "options": Object {
          "hidePanelTitles": false,
          "syncColors": true,
          "syncCursor": true,
          "syncTooltips": true,
          "useMargins": true,
        },
        "panels": Array [
          Object {
            "gridData": Object {
              "h": 1,
              "i": "0",
              "w": 1,
              "x": 0,
              "y": 0,
            },
            "id": "1",
            "panelConfig": Object {},
            "panelIndex": "0",
            "title": "Title 1",
            "type": "visualization",
            "version": undefined,
          },
          Object {
            "gridData": Object {
              "h": 2,
              "i": "1",
              "w": 2,
              "x": 1,
              "y": 1,
            },
            "panelConfig": Object {},
            "panelIndex": "1",
            "title": "Title 2",
            "type": "visualization",
            "version": undefined,
          },
        ],
        "timeRestore": false,
        "title": "test",
        "version": 1,
      }
    `);
  });

  test(`fails when it can't find the reference in the array`, () => {
    const attributes = {
      ...commonAttributes,
      id: '1',
      title: 'test',
      panels: [
        {
          panelIndex: '0',
          panelRefName: 'panel_0',
          title: 'Title 1',
          type: 'visualization',
          gridData: { x: 0, y: 0, w: 1, h: 1, i: '0' },
          panelConfig: {},
        },
      ],
    };
    expect(() =>
      injectReferences({ attributes, references: [] }, deps)
    ).toThrowErrorMatchingInlineSnapshot(`"Could not find reference \\"panel_0\\""`);
  });
});
