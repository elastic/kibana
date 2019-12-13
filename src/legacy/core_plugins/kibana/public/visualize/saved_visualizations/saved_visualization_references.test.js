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

import { extractReferences, injectReferences } from './saved_visualization_references';

describe('extractReferences', () => {
  test('extracts nothing if savedSearchId is empty', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
      },
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
  },
  "references": Array [],
}
`);
  });

  test('extracts references from savedSearchId', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        savedSearchId: '123',
      },
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "savedSearchRefName": "search_0",
  },
  "references": Array [
    Object {
      "id": "123",
      "name": "search_0",
      "type": "search",
    },
  ],
}
`);
  });

  test('extracts references from controls', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        visState: JSON.stringify({
          params: {
            controls: [
              {
                bar: true,
                indexPattern: 'pattern*',
              },
              {
                bar: false,
              },
            ],
          },
        }),
      },
    };
    const updatedDoc = extractReferences(doc);
    /* eslint-disable max-len */
    expect(updatedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "foo": true,
    "visState": "{\\"params\\":{\\"controls\\":[{\\"bar\\":true,\\"indexPatternRefName\\":\\"control_0_index_pattern\\"},{\\"bar\\":false}]}}",
  },
  "references": Array [
    Object {
      "id": "pattern*",
      "name": "control_0_index_pattern",
      "type": "index-pattern",
    },
  ],
}
`);
    /* eslint-enable max-len */
  });
});

describe('injectReferences', () => {
  test('injects nothing when savedSearchRefName is null', () => {
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

  test('injects references into context', () => {
    const context = {
      id: '1',
      foo: true,
      savedSearchRefName: 'search_0',
      visState: {
        params: {
          controls: [
            {
              foo: true,
              indexPatternRefName: 'control_0_index_pattern',
            },
            {
              foo: false,
            },
          ],
        },
      },
    };
    const references = [
      {
        name: 'search_0',
        type: 'search',
        id: '123',
      },
      {
        name: 'control_0_index_pattern',
        type: 'index-pattern',
        id: 'pattern*',
      },
    ];
    injectReferences(context, references);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
  "savedSearchId": "123",
  "visState": Object {
    "params": Object {
      "controls": Array [
        Object {
          "foo": true,
          "indexPattern": "pattern*",
        },
        Object {
          "foo": false,
        },
      ],
    },
  },
}
`);
  });

  test(`fails when it can't find the saved search reference in the array`, () => {
    const context = {
      id: '1',
      foo: true,
      savedSearchRefName: 'search_0',
    };
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find saved search reference \\"search_0\\""`
    );
  });

  test(`fails when it can't find the index pattern reference in the array`, () => {
    const context = {
      id: '1',
      visState: {
        params: {
          controls: [
            {
              foo: true,
              indexPatternRefName: 'control_0_index_pattern',
            },
          ],
        },
      },
    };
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find index pattern reference \\"control_0_index_pattern\\""`
    );
  });
});
