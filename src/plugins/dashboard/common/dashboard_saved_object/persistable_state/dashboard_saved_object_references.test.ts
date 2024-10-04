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
import { DashboardAttributes } from '../../content_management';

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
  kibanaSavedObjectMeta: { searchSourceJSON: '' },
  timeRestore: false,
  panelsJSON: '',
  version: 1,
  description: '',
  title: '',
};

describe('extractReferences', () => {
  test('extracts references from panelsJSON', () => {
    const doc = {
      id: '1',
      attributes: {
        ...commonAttributes,
        foo: true,
        panelsJSON: JSON.stringify([
          {
            panelIndex: 'panel-1',
            type: 'visualization',
            id: '1',
            title: 'Title 1',
            version: '7.9.1',
          },
          {
            panelIndex: 'panel-2',
            type: 'visualization',
            id: '2',
            title: 'Title 2',
            version: '7.9.1',
          },
        ]),
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
            "searchSourceJSON": "",
          },
          "panelsJSON": "[{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"panelIndex\\":\\"panel-1\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"panelRefName\\":\\"panel_panel-1\\"},{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"panelIndex\\":\\"panel-2\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\",\\"panelRefName\\":\\"panel_panel-2\\"}]",
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
        panelsJSON: JSON.stringify([
          {
            id: '1',
            title: 'Title 1',
            version: '7.9.1',
          },
        ]),
      },
      references: [],
    };
    expect(() => extractReferences(doc, deps)).toThrowErrorMatchingInlineSnapshot(
      `"\\"type\\" attribute is missing from panel \\"undefined\\""`
    );
  });

  test('passes when "id" attribute is missing from a panel', () => {
    const doc = {
      id: '1',
      attributes: {
        ...commonAttributes,
        foo: true,
        panelsJSON: JSON.stringify([
          {
            type: 'visualization',
            title: 'Title 1',
            version: '7.9.1',
          },
        ]),
      },
      references: [],
    };
    expect(extractReferences(doc, deps)).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "",
          "foo": true,
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "",
          },
          "panelsJSON": "[{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\"}]",
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
      panelsJSON: JSON.stringify([
        {
          panelRefName: 'panel_0',
          title: 'Title 1',
          version: '7.9.0',
        },
        {
          panelRefName: 'panel_1',
          title: 'Title 2',
          version: '7.9.0',
        },
      ]),
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
          "searchSourceJSON": "",
        },
        "panelsJSON": "[{\\"version\\":\\"7.9.0\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\"},{\\"version\\":\\"7.9.0\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\",\\"id\\":\\"2\\"}]",
        "timeRestore": false,
        "title": "test",
        "version": 1,
      }
    `);
  });

  test('skips when panelsJSON is missing', () => {
    const attributes = {
      id: '1',
      title: 'test',
    } as unknown as DashboardAttributes;
    const newAttributes = injectReferences({ attributes, references: [] }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "panelsJSON": "[]",
        "title": "test",
      }
    `);
  });

  test('skips when panelsJSON is not an array', () => {
    const attributes = {
      ...commonAttributes,
      id: '1',
      panelsJSON: '{}',
      title: 'test',
    };
    const newAttributes = injectReferences({ attributes, references: [] }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "description": "",
        "id": "1",
        "kibanaSavedObjectMeta": Object {
          "searchSourceJSON": "",
        },
        "panelsJSON": "[]",
        "timeRestore": false,
        "title": "test",
        "version": 1,
      }
    `);
  });

  test('skips a panel when panelRefName is missing', () => {
    const attributes = {
      ...commonAttributes,
      id: '1',
      title: 'test',
      panelsJSON: JSON.stringify([
        {
          panelRefName: 'panel_0',
          title: 'Title 1',
        },
        {
          title: 'Title 2',
        },
      ]),
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
          "searchSourceJSON": "",
        },
        "panelsJSON": "[{\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\"},{\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\"}]",
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
      panelsJSON: JSON.stringify([
        {
          panelRefName: 'panel_0',
          title: 'Title 1',
        },
      ]),
    };
    expect(() =>
      injectReferences({ attributes, references: [] }, deps)
    ).toThrowErrorMatchingInlineSnapshot(`"Could not find reference \\"panel_0\\""`);
  });
});
