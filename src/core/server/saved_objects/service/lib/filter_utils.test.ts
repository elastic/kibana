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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { esKuery } from '../../../../../plugins/data/server';

import { validateFilterKueryNode, validateConvertFilterToKueryNode } from './filter_utils';

const mockMappings = {
  properties: {
    updatedAt: {
      type: 'date',
    },
    foo: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        bytes: {
          type: 'number',
        },
      },
    },
    bar: {
      properties: {
        foo: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
    alert: {
      properties: {
        actions: {
          type: 'nested',
          properties: {
            group: {
              type: 'keyword',
            },
            actionRef: {
              type: 'keyword',
            },
            actionTypeId: {
              type: 'keyword',
            },
            params: {
              enabled: false,
              type: 'object',
            },
          },
        },
      },
    },
    hiddenType: {
      properties: {
        description: {
          type: 'text',
        },
      },
    },
  },
};

describe('Filter Utils', () => {
  describe('#validateConvertFilterToKueryNode', () => {
    test('Validate a simple filter', () => {
      expect(
        validateConvertFilterToKueryNode(['foo'], 'foo.attributes.title: "best"', mockMappings)
      ).toEqual(esKuery.fromKueryExpression('foo.title: "best"'));
    });
    test('Assemble filter kuery node saved object attributes with one saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and updatedAt: 5678654567) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Assemble filter with one type kuery node saved object attributes with multiple saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and updatedAt: 5678654567) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Assemble filter with two types kuery node saved object attributes with multiple saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          '(bar.updatedAt: 5678654567 OR foo.updatedAt: 5678654567) and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or bar.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '((type: bar and updatedAt: 5678654567) or (type: foo and updatedAt: 5678654567)) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or bar.description :*)'
        )
      );
    });

    test('Assemble filter with a nested filter', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['alert'],
          'alert.attributes.actions:{ actionTypeId: ".server-log" }',
          mockMappings
        )
      ).toEqual(esKuery.fromKueryExpression('alert.actions:{ actionTypeId: ".server-log" }'));
    });

    test('Lets make sure that we are throwing an exception if we get an error', () => {
      expect(() => {
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This key 'updatedAt' need to be wrapped by a saved object type like foo,bar: Bad Request"`
      );
    });

    test('Lets make sure that we are throwing an exception if we are using hiddentype with types', () => {
      expect(() => {
        validateConvertFilterToKueryNode([], 'hiddentype.title: "title"', mockMappings);
      }).toThrowErrorMatchingInlineSnapshot(`"This type hiddentype is not allowed: Bad Request"`);
    });
  });

  describe('#validateFilterKueryNode', () => {
    test('Validate filter query through KueryNode - happy path', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updatedAt',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
      ]);
    });

    test('Validate nested filter query through KueryNode - happy path', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'alert.attributes.actions:{ actionTypeId: ".server-log" }'
        ),
        types: ['alert'],
        indexMapping: mockMappings,
        hasNestedKey: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'alert.attributes.actions.actionTypeId',
          type: 'alert',
        },
      ]);
    });

    test('Return Error if key is not wrapper by a saved object type', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'updatedAt' need to be wrapped by a saved object type like foo",
          isSavedObjectAttr: true,
          key: 'updatedAt',
          type: null,
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
      ]);
    });

    test('Return Error if key of a saved object type is not wrapped with attributes', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updatedAt',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error:
            "This key 'foo.bytes' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'foo.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error:
            "This key 'foo.description' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'foo.description',
          type: 'foo',
        },
      ]);
    });

    test('Return Error if filter is not using an allowed type', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'bar.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: 'This type bar is not allowed',
          isSavedObjectAttr: true,
          key: 'bar.updatedAt',
          type: 'bar',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
      ]);
    });

    test('Return Error if filter is using an non-existing key in the index patterns of the saved object type', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'foo.updatedAt33: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.header: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'foo.updatedAt33' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.updatedAt33',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error:
            "This key 'foo.attributes.header' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.attributes.header',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
      ]);
    });

    test('Return Error if filter is using an non-existing key null key', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression('foo.attributes.description: hello AND bye'),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.1',
          error: 'The key is empty and needs to be wrapped by a saved object type like foo',
          isSavedObjectAttr: false,
          key: null,
          type: null,
        },
      ]);
    });
  });
});
