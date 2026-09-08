/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { expectErrors } from '../../../__tests__/commands/validation';
import { validate } from './validate';

const highlightExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'highlight', validate);
};

describe('HIGHLIGHT Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic queries', () => {
    it('does not report errors for a valid string query', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON textField', []);
    });

    it('does not report errors for a valid MATCH query', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT MATCH(textField, "ring") ON textField', []);
    });

    it('does not report errors for a prefix modifier', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT prefix = "hl_" "ring" ON textField', []);
    });

    it('does not report errors for a prefix modifier with a field list and WITH map', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT prefix = "hl_" "ring" ON keywordField, textField WITH { "encoder": "html" }',
        []
      );
    });
  });

  describe('ON field type validation', () => {
    it('reports an error when an ON field is not text or keyword', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON integerField', [
        'HIGHLIGHT only supports values of type text or keyword. Found "integerField" of type integer',
      ]);
    });

    it('does not report an error for a keyword field', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON keywordField', []);
    });

    it('reports an error for every offending field in the list', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON integerField, doubleField', [
        'HIGHLIGHT only supports values of type text or keyword. Found "integerField" of type integer',
        'HIGHLIGHT only supports values of type text or keyword. Found "doubleField" of type double',
      ]);
    });

    it('reports a missing ON clause', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring"', [
        '[HIGHLIGHT] Missing ON clause. Specify the fields to highlight.',
      ]);
    });
  });

  describe('prefix modifier validation', () => {
    it('reports a modifier keyword other than prefix', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT foo = "hl_" "ring" ON textField', [
        '[HIGHLIGHT] Invalid modifier [foo], expected [prefix]',
      ]);
    });

    it('accepts the prefix keyword regardless of case', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT PREFIX = "hl_" "ring" ON textField', []);
    });
  });

  describe('query expression validation', () => {
    it.each([
      'FROM index | HIGHLIGHT MATCH(textField, "ring") ON textField',
      'FROM index | HIGHLIGHT MATCH_PHRASE(textField, "ring") ON textField',
      'FROM index | HIGHLIGHT QSTR("ring") ON textField',
      'FROM index | HIGHLIGHT KQL("a:b") ON textField',
      'FROM index | HIGHLIGHT textField : "ring" ON textField',
      'FROM index | HIGHLIGHT MATCH(textField, "a") AND "b" ON textField',
      'FROM index | HIGHLIGHT KQL("a:b") OR QSTR("c") ON textField',
      'FROM index | HIGHLIGHT NOT "ring" ON textField',
    ])('accepts %s', (query) => {
      highlightExpectErrors(query, []);
    });

    it('reports a bare column used as the query', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT textField ON textField', [
        '[HIGHLIGHT] Query must be a full-text function (MATCH, MATCH_PHRASE, QSTR, KQL), a string literal, or a boolean combination of them. Found [textField]',
      ]);
    });

    it('reports a non-string literal used as the query', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT 5 ON textField', [
        '[HIGHLIGHT] Query must be a full-text function (MATCH, MATCH_PHRASE, QSTR, KQL), a string literal, or a boolean combination of them. Found [5]',
      ]);
    });

    it('reports an invalid operand nested inside a boolean combination', () => {
      // The shared operator check also reports AND's operand types; both messages are correct.
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" AND integerField ON textField', [
        '[HIGHLIGHT] Query must be a full-text function (MATCH, MATCH_PHRASE, QSTR, KQL), a string literal, or a boolean combination of them. Found [integerField]',
        'Invalid input types for AND.\n\nReceived (keyword, integer).\n\nExpected one of:\n  - (boolean, boolean)',
      ]);
    });

    it('defers to the shared location check for a disallowed function', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT LENGTH(textField) ON textField', [
        'Function LENGTH not allowed in HIGHLIGHT',
      ]);
    });
  });

  describe('WITH map validation', () => {
    it('reports an unknown WITH parameter name', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON textField WITH { "test": 789 }', [
        'Unknown parameter "test".',
      ]);
    });

    it('reports a WITH parameter with a wrong value type', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON textField WITH { "encoder": true }', [
        'Invalid type for parameter "encoder". Expected type: keyword. Received: boolean.',
      ]);
    });

    it('does not report errors for a valid WITH map including analyzer', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "analyzer": "standard", "encoder": "html" }',
        []
      );
    });

    it.each([
      ['encoder', 'default, html'],
      ['order', 'none, score'],
      ['boundary_scanner', 'sentence, word'],
    ])('reports a value outside the allowed set for %s', (option, allowed) => {
      highlightExpectErrors(
        `FROM index | HIGHLIGHT "ring" ON textField WITH { "${option}": "bogus" }`,
        [`Invalid value "bogus" for parameter "${option}". Expected one of: ${allowed}.`]
      );
    });

    it('accepts an enum value in a different case', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "order": "SCORE" }',
        []
      );
    });

    it('does not constrain options that have no allowed set', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "analyzer": "my_custom_analyzer" }',
        []
      );
    });
  });
});
