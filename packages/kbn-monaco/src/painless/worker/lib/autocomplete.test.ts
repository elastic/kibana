/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PainlessCompletionItem } from '../../types';

import {
  getStaticSuggestions,
  getFieldSuggestions,
  getClassMemberSuggestions,
  getConstructorSuggestions,
  getKeywords,
  getTypeSuggestions,
  Suggestion,
} from './autocomplete';

const keywords: PainlessCompletionItem[] = getKeywords();

const testSuggestions: Suggestion[] = [
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
      expect(getStaticSuggestions({ suggestions: testSuggestions })).toEqual({
        isIncomplete: false,
        suggestions: [
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
          ...getTypeSuggestions(),
        ],
      });
    });

    test('returns doc keyword when fields exist', () => {
      const autocompletion = getStaticSuggestions({
        suggestions: testSuggestions,
        hasFields: true,
      });
      const docSuggestion = autocompletion.suggestions.find(
        (suggestion) => suggestion.label === 'doc'
      );
      expect(Boolean(docSuggestion)).toBe(true);
    });

    test('returns emit keyword for runtime fields', () => {
      const autocompletion = getStaticSuggestions({
        suggestions: testSuggestions,
        isRuntimeContext: true,
      });
      const emitSuggestion = autocompletion.suggestions.find(
        (suggestion) => suggestion.label === 'emit'
      );
      expect(Boolean(emitSuggestion)).toBe(true);
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
