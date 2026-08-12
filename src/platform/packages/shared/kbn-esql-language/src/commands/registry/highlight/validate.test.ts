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
        '[HIGHLIGHT] ON field [integerField] must be of type text or keyword. Found integer',
      ]);
    });

    it('does not report an error for a text field', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON textField', []);
    });

    it('does not report an error for a keyword field', () => {
      highlightExpectErrors('FROM index | HIGHLIGHT "ring" ON keywordField', []);
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

    it('does not report errors for a valid query with multiple WITH options', () => {
      highlightExpectErrors(
        'FROM index | HIGHLIGHT "ring" ON textField WITH { "encoder": "html" }',
        []
      );
    });
  });
});
