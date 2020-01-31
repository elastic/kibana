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

import { extractReferences, injectReferences } from './saved_dashboard_references';

describe('extractReferences', () => {
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
          },
          {
            type: 'visualization',
            id: '2',
            title: 'Title 2',
          },
        ]),
      },
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "panelsJSON": "[{\\"title\\":\\"Title 1\\",\\"panelRefName\\":\\"panel_0\\"},{\\"title\\":\\"Title 2\\",\\"panelRefName\\":\\"panel_1\\"}]",
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
          },
        ]),
      },
    };
    expect(() => extractReferences(doc)).toThrowErrorMatchingInlineSnapshot(
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
          },
        ]),
      },
    };
    expect(extractReferences(doc)).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "panelsJSON": "[{\\"type\\":\\"visualization\\",\\"title\\":\\"Title 1\\"}]",
  },
  "references": Array [],
}
`);
  });
});

describe('injectReferences', () => {
  test('injects references into context', () => {
    const context = {
      id: '1',
      foo: true,
      panelsJSON: JSON.stringify([
        {
          panelRefName: 'panel_0',
          title: 'Title 1',
        },
        {
          panelRefName: 'panel_1',
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
      {
        name: 'panel_1',
        type: 'visualization',
        id: '2',
      },
    ];
    injectReferences(context, references);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
  "panelsJSON": "[{\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\",\\"type\\":\\"visualization\\"},{\\"title\\":\\"Title 2\\",\\"id\\":\\"2\\",\\"type\\":\\"visualization\\"}]",
}
`);
  });

  test('skips when panelsJSON is missing', () => {
    const context = {
      id: '1',
      foo: true,
    };
    injectReferences(context, []);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
}
`);
  });

  test('skips when panelsJSON is not an array', () => {
    const context = {
      id: '1',
      foo: true,
      panelsJSON: '{}',
    };
    injectReferences(context, []);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
  "panelsJSON": "{}",
}
`);
  });

  test('skips a panel when panelRefName is missing', () => {
    const context = {
      id: '1',
      foo: true,
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
    injectReferences(context, references);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
  "panelsJSON": "[{\\"title\\":\\"Title 1\\",\\"id\\":\\"1\\",\\"type\\":\\"visualization\\"},{\\"title\\":\\"Title 2\\"}]",
}
`);
  });

  test(`fails when it can't find the reference in the array`, () => {
    const context = {
      id: '1',
      foo: true,
      panelsJSON: JSON.stringify([
        {
          panelRefName: 'panel_0',
          title: 'Title 1',
        },
      ]),
    };
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find reference \\"panel_0\\""`
    );
  });
});
