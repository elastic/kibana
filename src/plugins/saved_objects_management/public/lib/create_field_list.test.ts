/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SimpleSavedObject, SavedObjectReference } from '../../../../core/public';
import { savedObjectsServiceMock } from '../../../../core/public/mocks';
import { createFieldList } from './create_field_list';

const savedObjectClientMock = savedObjectsServiceMock.createStartContract().client;

const createObject = <T>(
  attributes: T,
  references: SavedObjectReference[] = []
): SimpleSavedObject<T> =>
  new SimpleSavedObject<T>(savedObjectClientMock, {
    id: 'id',
    type: 'type',
    migrationVersion: {},
    attributes,
    references,
  });

describe('createFieldList', () => {
  it('generate fields based on the object attributes', () => {
    const obj = createObject({
      textField: 'some text',
      numberField: 12,
      boolField: true,
    });
    expect(createFieldList(obj)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "textField",
          "type": "text",
          "value": "some text",
        },
        Object {
          "name": "numberField",
          "type": "number",
          "value": 12,
        },
        Object {
          "name": "boolField",
          "type": "boolean",
          "value": true,
        },
        Object {
          "name": "references",
          "type": "array",
          "value": "[]",
        },
      ]
    `);
  });

  it('detects json fields', () => {
    const obj = createObject({
      jsonField: `{"data": "value"}`,
    });
    expect(createFieldList(obj)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "jsonField",
          "type": "json",
          "value": "{
        \\"data\\": \\"value\\"
      }",
        },
        Object {
          "name": "references",
          "type": "array",
          "value": "[]",
        },
      ]
    `);
  });

  it('handles array fields', () => {
    const obj = createObject({
      someArray: [1, 2, 3],
    });
    expect(createFieldList(obj)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "someArray",
          "type": "array",
          "value": "[
        1,
        2,
        3
      ]",
        },
        Object {
          "name": "references",
          "type": "array",
          "value": "[]",
        },
      ]
    `);
  });

  it(`generates a field for the object's references`, () => {
    const obj = createObject(
      {
        someString: 'foo',
      },
      [
        { id: 'ref1', type: 'type', name: 'Ref 1' },
        { id: 'ref12', type: 'other-type', name: 'Ref 2' },
      ]
    );
    expect(createFieldList(obj)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "someString",
          "type": "text",
          "value": "foo",
        },
        Object {
          "name": "references",
          "type": "array",
          "value": "[
        {
          \\"id\\": \\"ref1\\",
          \\"type\\": \\"type\\",
          \\"name\\": \\"Ref 1\\"
        },
        {
          \\"id\\": \\"ref12\\",
          \\"type\\": \\"other-type\\",
          \\"name\\": \\"Ref 2\\"
        }
      ]",
        },
      ]
    `);
  });

  it('recursively collect nested fields', () => {
    const obj = createObject({
      firstLevel: {
        firstLevelField: 'foo',
        secondLevel: {
          secondLevelFieldA: 'A',
          secondLevelFieldB: 'B',
        },
      },
    });
    expect(createFieldList(obj)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "firstLevel.firstLevelField",
          "type": "text",
          "value": "foo",
        },
        Object {
          "name": "firstLevel.secondLevel.secondLevelFieldA",
          "type": "text",
          "value": "A",
        },
        Object {
          "name": "firstLevel.secondLevel.secondLevelFieldB",
          "type": "text",
          "value": "B",
        },
        Object {
          "name": "references",
          "type": "array",
          "value": "[]",
        },
      ]
    `);
  });
});
