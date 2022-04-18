/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractReferences,
  injectReferences,
  InjectDeps,
  ExtractDeps,
} from './saved_dashboard_references';

import { createExtract, createInject } from './embeddable/dashboard_container_persistable_state';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';

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
const deps: InjectDeps & ExtractDeps = {
  embeddablePersistableStateService: embeddablePersistableStateServiceMock,
};

describe('legacy extract references', () => {
  test('extracts references from panelsJSON', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        panelsJSON: JSON.stringify([
          {
            type: 'visualization',
            id: '1',
            title: 'Title 1',
            version: '7.0.0',
          },
          {
            type: 'visualization',
            id: '2',
            title: 'Title 2',
            version: '7.0.0',
          },
        ]),
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc, deps);

    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "foo": true,
          "panelsJSON": "[{\\"title\\":\\"Title 1\\",\\"version\\":\\"7.0.0\\",\\"panelRefName\\":\\"panel_0\\"},{\\"title\\":\\"Title 2\\",\\"version\\":\\"7.0.0\\",\\"panelRefName\\":\\"panel_1\\"}]",
        },
        "references": Array [
          Object {
            "id": "1",
            "name": "panel_0",
            "type": "visualization",
          },
          Object {
            "id": "2",
            "name": "panel_1",
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
        foo: true,
        panelsJSON: JSON.stringify([
          {
            id: '1',
            title: 'Title 1',
            version: '7.0.0',
          },
        ]),
      },
      references: [],
    };
    expect(() => extractReferences(doc, deps)).toThrowErrorMatchingInlineSnapshot(
      `"\\"type\\" attribute is missing from panel \\"0\\""`
    );
  });

  test('passes when "id" attribute is missing from a panel', () => {
    const doc = {
      id: '1',
      attributes: {
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
          "foo": true,
          "panelsJSON": "[{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\"}]",
        },
        "references": Array [],
      }
    `);
  });

  // https://github.com/elastic/kibana/issues/93772
  test('passes when received older RAW SO with older panels', () => {
    const doc = {
      id: '1',
      attributes: {
        hits: 0,
        timeFrom: 'now-16h/h',
        timeTo: 'now',
        refreshInterval: {
          display: '1 minute',
          section: 2,
          value: 60000,
          pause: false,
        },
        description: '',
        uiStateJSON: '{"P-1":{"vis":{"legendOpen":false}}}',
        title: 'Errors/Fatals/Warnings dashboard',
        timeRestore: true,
        version: 1,
        panelsJSON:
          '[{"col":1,"id":"544891f0-2cf2-11e8-9735-93e95b055f48","panelIndex":1,"row":1,"size_x":12,"size_y":8,"type":"visualization"}]',
        optionsJSON: '{"darkTheme":true}',
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"highlightAll":true,"filter":[{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}}}]}',
        },
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc, deps);

    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "",
          "hits": 0,
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"highlightAll\\":true,\\"filter\\":[{\\"query\\":{\\"query_string\\":{\\"analyze_wildcard\\":true,\\"query\\":\\"*\\"}}}]}",
          },
          "optionsJSON": "{\\"darkTheme\\":true}",
          "panelsJSON": "[{\\"col\\":1,\\"panelIndex\\":1,\\"row\\":1,\\"size_x\\":12,\\"size_y\\":8,\\"panelRefName\\":\\"panel_0\\"}]",
          "refreshInterval": Object {
            "display": "1 minute",
            "pause": false,
            "section": 2,
            "value": 60000,
          },
          "timeFrom": "now-16h/h",
          "timeRestore": true,
          "timeTo": "now",
          "title": "Errors/Fatals/Warnings dashboard",
          "uiStateJSON": "{\\"P-1\\":{\\"vis\\":{\\"legendOpen\\":false}}}",
          "version": 1,
        },
        "references": Array [
          Object {
            "id": "544891f0-2cf2-11e8-9735-93e95b055f48",
            "name": "panel_0",
            "type": "visualization",
          },
        ],
      }
    `);

    const panel = JSON.parse(updatedDoc.attributes.panelsJSON as string)[0];

    // unknown older panel keys are left untouched
    expect(panel).toHaveProperty('col');
    expect(panel).toHaveProperty('row');
    expect(panel).toHaveProperty('size_x');
    expect(panel).toHaveProperty('size_y');
  });
});

describe('extractReferences', () => {
  test('extracts references from panelsJSON', () => {
    const doc = {
      id: '1',
      attributes: {
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
          "foo": true,
          "panelsJSON": "[{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"panelIndex\\":\\"panel-1\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"panelRefName\\":\\"panel_panel-1\\"},{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"panelIndex\\":\\"panel-2\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\",\\"panelRefName\\":\\"panel_panel-2\\"}]",
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
      `"\\"type\\" attribute is missing from panel \\"0\\""`
    );
  });

  test('passes when "id" attribute is missing from a panel', () => {
    const doc = {
      id: '1',
      attributes: {
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
          "foo": true,
          "panelsJSON": "[{\\"version\\":\\"7.9.1\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\"}]",
        },
        "references": Array [],
      }
    `);
  });
});

describe('injectReferences', () => {
  test('returns injected attributes', () => {
    const attributes = {
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
        "id": "1",
        "panelsJSON": "[{\\"version\\":\\"7.9.0\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\"},{\\"version\\":\\"7.9.0\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\",\\"id\\":\\"2\\"}]",
        "title": "test",
      }
    `);
  });

  test('skips when panelsJSON is missing', () => {
    const attributes = {
      id: '1',
      title: 'test',
    };
    const newAttributes = injectReferences({ attributes, references: [] }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "title": "test",
      }
    `);
  });

  test('skips when panelsJSON is not an array', () => {
    const attributes = {
      id: '1',
      panelsJSON: '{}',
      title: 'test',
    };
    const newAttributes = injectReferences({ attributes, references: [] }, deps);
    expect(newAttributes).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "panelsJSON": "{}",
        "title": "test",
      }
    `);
  });

  test('skips a panel when panelRefName is missing', () => {
    const attributes = {
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
        "id": "1",
        "panelsJSON": "[{\\"version\\":\\"\\",\\"type\\":\\"visualization\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\"},{\\"version\\":\\"\\",\\"embeddableConfig\\":{},\\"title\\":\\"Title 2\\"}]",
        "title": "test",
      }
    `);
  });

  test(`fails when it can't find the reference in the array`, () => {
    const attributes = {
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
