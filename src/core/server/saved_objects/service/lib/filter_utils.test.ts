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

import { fromKueryExpression } from '@kbn/es-query';

import {
  validateFilterKueryNode,
  getSavedObjectTypeIndexPatterns,
  validateConvertFilterToKueryNode,
} from './filter_utils';
import { SavedObjectsIndexPattern } from './cache_index_patterns';

const mockIndexPatterns: SavedObjectsIndexPattern = {
  fields: [
    {
      name: 'updatedAt',
      type: 'date',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'foo.title',
      type: 'text',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'foo.description',
      type: 'text',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'foo.bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'bar.foo',
      type: 'text',
      aggregatable: true,
      searchable: true,
    },
  ],
  title: 'mock',
};

describe('Filter Utils', () => {
  describe('#validateConvertFilterToKueryNode', () => {
    test('Validate a simple filter', () => {
      expect(
        validateConvertFilterToKueryNode(['foo'], 'foo.attributes.title: "best"', mockIndexPatterns)
      ).toEqual(fromKueryExpression('foo.title: "best"'));
    });
    test('Assemble filter kuery node saved object attributes with one saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo'],
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockIndexPatterns
        )
      ).toEqual(
        fromKueryExpression(
          '(type: foo and updatedAt: 5678654567) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Assemble filter kuery node saved object attributes with multiple saved object type', () => {
      expect(
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockIndexPatterns
        )
      ).toEqual(
        fromKueryExpression(
          '((type: foo and updatedAt: 5678654567) or (type: bar and updatedAt: 5678654567)) and foo.bytes > 1000 and foo.bytes < 8000 and foo.title: "best" and (foo.description: t* or foo.description :*)'
        )
      );
    });

    test('Lets make sure that we are throwing an exception if we get an error', () => {
      expect(() => {
        validateConvertFilterToKueryNode(
          ['foo', 'bar'],
          'updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)',
          mockIndexPatterns
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This key 'updatedAt' need to be wrapped by a saved object type like foo,bar"`
      );
    });
  });

  describe('#validateFilterKueryNode', () => {
    test('Validate filter query through KueryNode - happy path', () => {
      const validationObject = validateFilterKueryNode(
        fromKueryExpression(
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        ['foo'],
        getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns)
      );

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updatedAt',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
      ]);
    });

    test('Return Error if key is not wrapper by a saved object type', () => {
      const validationObject = validateFilterKueryNode(
        fromKueryExpression(
          'updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        ['foo'],
        getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns)
      );

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'updatedAt' need to be wrapped by a saved object type like foo",
          isSavedObjectAttr: true,
          key: 'updatedAt',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
      ]);
    });

    test('Return Error if key of a saved object type is not wrapped with attributes', () => {
      const validationObject = validateFilterKueryNode(
        fromKueryExpression(
          'foo.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.description :*)'
        ),
        ['foo'],
        getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns)
      );

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'foo.updatedAt',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error:
            "This key 'foo.bytes' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'foo.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error:
            "This key 'foo.description' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'foo.description',
        },
      ]);
    });

    test('Return Error if filter is not using an allowed type', () => {
      const validationObject = validateFilterKueryNode(
        fromKueryExpression(
          'bar.updatedAt: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        ['foo'],
        getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns)
      );

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: 'This type bar is not allowed',
          isSavedObjectAttr: true,
          key: 'bar.updatedAt',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.title',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
      ]);
    });

    test('Return Error if filter is using an non-existing key in the index patterns of the saved object type', () => {
      const validationObject = validateFilterKueryNode(
        fromKueryExpression(
          'foo.updatedAt33: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.header: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
        ),
        ['foo'],
        getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns)
      );

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'foo.updatedAt33' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.updatedAt33',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.bytes',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.0',
          error:
            "This key 'foo.attributes.header' does NOT exist in foo saved object index patterns",
          isSavedObjectAttr: false,
          key: 'foo.attributes.header',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
        {
          astPath: 'arguments.1.arguments.1.arguments.1.arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'foo.attributes.description',
        },
      ]);
    });
  });

  describe('#getSavedObjectTypeIndexPatterns', () => {
    test('Get index patterns related to your type', () => {
      const indexPatternsFilterByType = getSavedObjectTypeIndexPatterns(['foo'], mockIndexPatterns);

      expect(indexPatternsFilterByType).toEqual([
        {
          name: 'updatedAt',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'foo.title',
          type: 'text',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'foo.description',
          type: 'text',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'foo.bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
      ]);
    });
  });
});
