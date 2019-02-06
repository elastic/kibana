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
    "savedSearchId": undefined,
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
    };
    const references = [
      {
        name: 'search_0',
        type: 'search',
        id: '123',
      },
    ];
    injectReferences(context, references);
    expect(context).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "1",
  "savedSearchId": "123",
}
`);
  });

  test(`fails when it can't find the reference in the array`, () => {
    const context = {
      id: '1',
      foo: true,
      savedSearchRefName: 'search_0',
    };
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find reference \\"search_0\\""`
    );
  });
});
