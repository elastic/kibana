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

    it('does not report errors when ON is omitted', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring"', []);
    });

    it('accepts a parameter in the ON list', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON ?field', []);
    });
  });

  describe('ON wildcard validation', () => {
    it('accepts a lone *', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON *', []);
    });

    it('rejects a wildcard pattern other than *', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON text*', [
        '[HIGHLIGHT] Invalid pattern [text*] in ON, expected field names or [*]',
      ]);
    });

    it('rejects * combined with other fields', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON *, textField', [
        '[HIGHLIGHT] [*] cannot be combined with other fields in ON',
      ]);
    });
  });

  describe('query and ON consistency', () => {
    it('reports a query field missing from ON when both are explicit', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT MATCH(textField, "ring") ON keywordField', [
        '[HIGHLIGHT] Query field [textField] is not in the ON fields [keywordField]',
      ]);
    });

    it('accepts a query field that is in ON', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT textField : "ring" ON keywordField, textField',
        []
      );
    });

    it('accepts any query field when ON holds a parameter', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT MATCH(textField, "ring") ON ?field', []);
      highlightExpectErrors(
        'FROM index | HIGHLIGHT MATCH(textField, "ring") ON keywordField, ?field',
        []
      );
    });

    it('does not check a query field that is a parameter', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT MATCH(?field, "ring") ON textField', []);
      highlightExpectErrors('FROM index | HIGHLIGHT ??field : "ring" ON textField', []);
    });

    it('accepts any query field when ON is *', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT MATCH(textField, "ring") ON *', []);
    });

    it('does not check the fields of a query that targets none', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT QSTR("ring") ON keywordField', []);
    });
  });

  describe('omitted query', () => {
    it('does not report errors, with or without an earlier WHERE', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT', []);
      highlightExpectErrors(
        'FROM index | WHERE MATCH(textField, "ring") | HIGHLIGHT ON textField',
        []
      );
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
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "order": "SCORE", "boundary_scanner": "Word" }',
        []
      );
    });

    it('treats the encoder value as case-sensitive', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "encoder": "html" }',
        []
      );
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "encoder": "HTML" }',
        ['Invalid value "HTML" for parameter "encoder". Expected one of: default, html.']
      );
    });

    it('accepts a single pre_tags value as a string or one-element array', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "pre_tags": "<b>" }',
        []
      );
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "pre_tags": ["<b>"] }',
        []
      );
    });

    it('rejects multiple pre_tags values', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "pre_tags": ["<b>", "<i>"] }',
        ['Invalid value "["<b>","<i>"]" for parameter "pre_tags". Expected one of: a single tag.']
      );
    });

    it('accepts -1 to unset max_analyzed_offset', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "max_analyzed_offset": -1 }',
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
