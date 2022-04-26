/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import * as esKuery from '@kbn/es-query';

import {
  validateFilterKueryNode,
  validateConvertFilterToKueryNode,
  fieldDefined,
  hasFilterKeyError,
} from './filter_utils';

const mockMappings = {
  properties: {
    updated_at: {
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
          type: 'integer',
        },
      },
    },
    bar: {
      properties: {
        _id: {
          type: 'keyword',
        },
        foo: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
    bean: {
      properties: {
        canned: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
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
        params: {
          type: 'flattened',
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
} as const;

describe('Filter Utils', () => {
  describe('#validateConvertFilterToKueryNode', () => {
    test('Empty string filters are ignored', () => {
      expect(validateConvertFilterToKueryNode(['foo'], '', mockMappings)).toBeUndefined();
    });
    test('Validate a simple KQL KueryNode filter', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo'],
          esKuery.nodeTypes.function.buildNode('is', `foo.attributes.title`, 'best', true),
          mockMappings
        )
      ).toEqual(esKuery.fromKueryExpression('foo.title: "best"'));
    });

    test('does not mutate the input KueryNode', () => {
      const input = esKuery.nodeTypes.function.buildNode(
        'is',
        `foo.attributes.title`,
        'best',
        true
      );

      const inputCopy = cloneDeep(input);

      validateConvertFilterToKueryNode(['foo'], input, mockMappings);

      expect(input).toEqual(inputCopy);
    });

    test('Validate a simple KQL expression filter', () => {
      expect(
        validateConvertFilterToKueryNode(['foo'], 'foo.attributes.title: "best"', mockMappings)
      ).toEqual(esKuery.fromKueryExpression('foo.title: "best"'));
    });
    test('Validate a multi-field KQL expression filter', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['bean'],
          'bean.attributes.canned.text: "best"',
          mockMappings
        )
      ).toEqual(esKuery.fromKueryExpression('bean.canned.text: "best"'));
    });
    test('Assemble filter kuery node saved object attributes with one saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and updated_at: 5678654567) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Assemble filter with one type kuery node saved object attributes with multiple saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and updated_at: 5678654567) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Assemble filter with two types kuery node saved object attributes with multiple saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          '(bar.updated_at: 5678654567 OR foo.updated_at: 5678654567) and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or bar.attributes.description :*)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '((type: bar and updated_at: 5678654567) or (type: foo and updated_at: 5678654567)) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or bar.description :*)'
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

    test('Assemble filter for flattened fields', () => {
      expect(
        validateConvertFilterToKueryNode(['alert'], 'alert.attributes.params.foo:bar', mockMappings)
      ).toEqual(esKuery.fromKueryExpression('alert.params.foo:bar'));
    });

    test('Assemble filter with just "id" and one type', () => {
      expect(validateConvertFilterToKueryNode(['foo'], 'foo.id: 0123456789', mockMappings)).toEqual(
        esKuery.fromKueryExpression('type: foo and _id: 0123456789')
      );
    });

    test('Assemble filter with saved object attribute "id" and one type and more', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo.id: 0123456789 and (foo.updated_at: 5678654567 or foo.attributes.bytes > 1000)',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and _id: 0123456789) and ((type: foo and updated_at: 5678654567) or foo.bytes > 1000)'
        )
      );
    });

    test('Assemble filter with saved object attribute "id" and multi type and more', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'foo.id: 0123456789 and bar.id: 9876543210',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression(
          '(type: foo and _id: 0123456789) and (type: bar and _id: 9876543210)'
        )
      );
    });

    test('Allow saved object type to defined "_id" attributes and filter on it', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'foo.id: 0123456789 and bar.attributes._id: 9876543210',
          mockMappings
        )
      ).toEqual(
        esKuery.fromKueryExpression('(type: foo and _id: 0123456789) and (bar._id: 9876543210)')
      );
    });

    test('Lets make sure that we are throwing an exception if we are using id outside of saved object attribute when it does not belong', () => {
      expect(() => {
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo.attributes.id: 0123456789 and (foo.updated_at: 5678654567 or foo.attributes.bytes > 1000)',
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This key 'foo.attributes.id' does NOT exist in foo saved object index patterns: Bad Request"`
      );
    });

    test('Lets make sure that we are throwing an exception if we are using _id', () => {
      expect(() => {
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo._id: 0123456789 and (foo.updated_at: 5678654567 or foo.attributes.bytes > 1000)',
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This key 'foo._id' does NOT exist in foo saved object index patterns: Bad Request"`
      );
    });

    test('Lets make sure that we are throwing an exception if we get an error', () => {
      expect(() => {
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This key 'updated_at' need to be wrapped by a saved object type like foo,bar: Bad Request"`
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
          'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updated_at',
          type: 'foo',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.3',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.1',
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
          'updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'updated_at' need to be wrapped by a saved object type like foo",
          isSavedObjectAttr: true,
          key: 'updated_at',
          type: null,
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.3',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.1',
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
          'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updated_at',
          type: 'foo',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.2',
          error:
            "This key 'foo.bytes' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'foo.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.3',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.1',
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
          'bar.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: 'This type bar is not allowed',
          isSavedObjectAttr: true,
          key: 'bar.updated_at',
          type: 'bar',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.3',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.1',
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
          'foo.updated_at33: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.header: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        types: ['foo'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'foo.updated_at33' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.updated_at33',
          type: 'foo',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
          type: 'foo',
        },
        {
          astPath: 'arguments.3',
          error:
            "This key 'foo.attributes.header' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.attributes.header',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
          type: 'foo',
        },
        {
          astPath: 'arguments.4.arguments.1',
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

    test('Validate multiple items nested filter query through KueryNode', () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          'alert.attributes.actions:{ actionTypeId: ".server-log" AND actionRef: "foo" }'
        ),
        types: ['alert'],
        indexMapping: mockMappings,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'alert.attributes.actions.actionTypeId',
          type: 'alert',
        },
        {
          astPath: 'arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'alert.attributes.actions.actionRef',
          type: 'alert',
        },
      ]);
    });
  });

  describe('#hasFilterKeyError', () => {
    test('Return no error if filter key is valid', () => {
      const hasError = hasFilterKeyError('bean.attributes.canned.text', ['bean'], mockMappings);

      expect(hasError).toBeNull();
    });

    test('Return error if key is not defined', () => {
      const hasError = hasFilterKeyError(undefined, ['bean'], mockMappings);

      expect(hasError).toEqual(
        'The key is empty and needs to be wrapped by a saved object type like bean'
      );
    });

    test('Return error if key is null', () => {
      const hasError = hasFilterKeyError(null, ['bean'], mockMappings);

      expect(hasError).toEqual(
        'The key is empty and needs to be wrapped by a saved object type like bean'
      );
    });

    test('Return error if key does not identify an SO wrapper', () => {
      const hasError = hasFilterKeyError('beanattributescannedtext', ['bean'], mockMappings);

      expect(hasError).toEqual(
        "This key 'beanattributescannedtext' need to be wrapped by a saved object type like bean"
      );
    });

    test('Return error if key does not match an SO type', () => {
      const hasError = hasFilterKeyError('canned.attributes.bean.text', ['bean'], mockMappings);

      expect(hasError).toEqual('This type canned is not allowed');
    });

    test('Return error if key does not match SO attribute structure', () => {
      const hasError = hasFilterKeyError('bean.canned.text', ['bean'], mockMappings);

      expect(hasError).toEqual(
        "This key 'bean.canned.text' does NOT match the filter proposition SavedObjectType.attributes.key"
      );
    });

    test('Return error if key matches SO attribute parent, not attribute itself', () => {
      const hasError = hasFilterKeyError('alert.actions', ['alert'], mockMappings);

      expect(hasError).toEqual(
        "This key 'alert.actions' does NOT match the filter proposition SavedObjectType.attributes.key"
      );
    });

    test('Return error if key refers to a non-existent attribute parent', () => {
      const hasError = hasFilterKeyError('alert.not_a_key', ['alert'], mockMappings);

      expect(hasError).toEqual(
        "This key 'alert.not_a_key' does NOT exist in alert saved object index patterns"
      );
    });

    test('Return error if key refers to a non-existent attribute', () => {
      const hasError = hasFilterKeyError('bean.attributes.red', ['bean'], mockMappings);

      expect(hasError).toEqual(
        "This key 'bean.attributes.red' does NOT exist in bean saved object index patterns"
      );
    });
  });

  describe('#fieldDefined', () => {
    test('Return false if filter is using an non-existing key', () => {
      const isFieldDefined = fieldDefined(mockMappings, 'foo.not_a_key');

      expect(isFieldDefined).toBeFalsy();
    });

    test('Return true if filter is using an existing key', () => {
      const isFieldDefined = fieldDefined(mockMappings, 'foo.title');

      expect(isFieldDefined).toBeTruthy();
    });

    test('Return true if filter is using a default for a multi-field property', () => {
      const isFieldDefined = fieldDefined(mockMappings, 'bean.canned');

      expect(isFieldDefined).toBeTruthy();
    });

    test('Return true if filter is using a non-default for a multi-field property', () => {
      const isFieldDefined = fieldDefined(mockMappings, 'bean.canned.text');

      expect(isFieldDefined).toBeTruthy();
    });
  });
});
