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

import { PainlessCompletionItem } from '../../types';
import { lexerRules } from '../../lexer_rules';

import {
  getStaticSuggestions,
  getFieldSuggestions,
  getClassMemberSuggestions,
  getPrimitives,
  getConstructorSuggestions,
  Suggestion,
} from './autocomplete';

const keywords: PainlessCompletionItem[] = lexerRules.keywords.map((keyword) => {
  return {
    label: keyword,
    kind: 'keyword',
    documentation: 'Keyword: char',
    insertText: keyword,
  };
});

const testSuggestions: Suggestion[] = [
  {
    properties: undefined,
    constructorDefinition: undefined,
    documentation: 'Primitive: boolean',
    insertText: 'boolean',
    kind: 'type',
    label: 'boolean',
  },
  {
    properties: undefined,
    constructorDefinition: undefined,
    documentation: 'Primitive: int',
    insertText: 'int',
    kind: 'type',
    label: 'int',
  },
  {
    properties: [
      {
        documentation: 'PI: double',
        insertText: 'PI',
        kind: 'property',
        label: 'PI',
      },
      {
        documentation: 'pow(double a, double b): double',
        insertText: 'pow',
        kind: 'method',
        label: 'pow',
      },
    ],
    constructorDefinition: undefined,
    documentation: 'Class: Math',
    insertText: 'Math',
    kind: 'class',
    label: 'Math',
  },
  {
    constructorDefinition: {
      documentation: 'Constructor: ArithmeticException',
      insertText: 'ArithmeticException',
      kind: 'constructor',
      label: 'ArithmeticException',
    },
    documentation: 'Class: ArithmeticException',
    insertText: 'ArithmeticException',
    kind: 'class',
    label: 'ArithmeticException',
    properties: [
      {
        documentation: 'equals(java.lang.Object a): boolean',
        insertText: 'equals',
        kind: 'method',
        label: 'equals',
      },
    ],
  },
];

describe('Autocomplete lib', () => {
  describe('Static suggestions', () => {
    test('returns static suggestions', () => {
      expect(getStaticSuggestions(testSuggestions, false)).toEqual({
        isIncomplete: false,
        suggestions: [
          {
            documentation: 'Primitive: boolean',
            insertText: 'boolean',
            kind: 'type',
            label: 'boolean',
          },
          {
            documentation: 'Primitive: int',
            insertText: 'int',
            kind: 'type',
            label: 'int',
          },
          {
            documentation: 'Class: Math',
            insertText: 'Math',
            kind: 'class',
            label: 'Math',
          },
          {
            documentation: 'Class: ArithmeticException',
            insertText: 'ArithmeticException',
            kind: 'class',
            label: 'ArithmeticException',
          },
          ...keywords,
        ],
      });
    });

    test('returns doc keyword when fields exist', () => {
      const autocompletion = getStaticSuggestions(testSuggestions, true);
      const docSuggestion = autocompletion.suggestions.find(
        (suggestion) => suggestion.label === 'doc'
      );
      expect(Boolean(docSuggestion)).toBe(true);
    });
  });

  describe('getPrimitives()', () => {
    test('returns primitive values', () => {
      expect(getPrimitives(testSuggestions)).toEqual(['boolean', 'int']);
    });
  });

  describe('getClassMemberSuggestions()', () => {
    test('returns class member suggestions', () => {
      expect(getClassMemberSuggestions(testSuggestions, 'Math')).toEqual({
        isIncomplete: false,
        suggestions: [
          {
            documentation: 'PI: double',
            insertText: 'PI',
            kind: 'property',
            label: 'PI',
          },
          {
            documentation: 'pow(double a, double b): double',
            insertText: 'pow',
            kind: 'method',
            label: 'pow',
          },
        ],
      });
    });

    test('returns an empty suggestions array if class does not exist', () => {
      expect(getClassMemberSuggestions(testSuggestions, 'foobar')).toEqual({
        isIncomplete: false,
        suggestions: [],
      });
    });
  });

  describe('getFieldSuggestions()', () => {
    test('returns field suggestions', () => {
      const fields = [
        {
          name: 'field1',
          type: 'float',
        },
        {
          name: 'field2',
          type: 'boolean',
        },
      ];

      expect(getFieldSuggestions(fields)).toEqual({
        isIncomplete: false,
        suggestions: [
          {
            documentation: `Retrieve the value for field 'field1'`,
            insertText: `field1'`,
            kind: 'field',
            label: 'field1',
          },
          {
            documentation: `Retrieve the value for field 'field2'`,
            insertText: `field2'`,
            kind: 'field',
            label: 'field2',
          },
        ],
      });
    });
  });

  describe('getConstructorSuggestions()', () => {
    test('returns constructor suggestions', () => {
      expect(getConstructorSuggestions(testSuggestions)).toEqual({
        isIncomplete: false,
        suggestions: [
          {
            documentation: 'Constructor: ArithmeticException',
            insertText: 'ArithmeticException',
            kind: 'constructor',
            label: 'ArithmeticException',
          },
        ],
      });
    });
  });
});
