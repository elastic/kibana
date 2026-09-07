/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { mockContext } from '../../../__tests__/commands/context_fixtures';

const rerankExpectErrors = (query: string, expected: string[]) =>
  expectErrors(query, expected, mockContext, 'rerank', validate);

describe('RERANK Validation', () => {
  describe('Query', () => {
    test('query as parameter', () => {
      rerankExpectErrors('FROM index | RERANK ?q ON keywordField', []);
    });

    test('Support ON clause validation for boolean expressions', () => {
      rerankExpectErrors(
        'FROM index | RERANK col0="some text" ON textField=textField LIKE "a*"',
        []
      );
    });

    test('unsupported field type', () => {
      rerankExpectErrors('FROM index | RERANK col0=2 ON keywordField', [
        'RERANK query must be of type text. Found integer',
      ]);
    });
  });

  describe('Inference_id check', () => {
    test('inference_id as parameter', () => {
      rerankExpectErrors(
        'FROM index | RERANK "q" ON keywordField WITH { "inference_id": ?named_param }',
        []
      );
    });

    const msg = '"inference_id" parameter is required for RERANK.';

    test('WITH without map (partial: WITH)', () => {
      rerankExpectErrors('FROM index | RERANK "q" ON keywordField WITH', [msg]);
    });

    test('WITH with partial map start (WITH{)', () => {
      rerankExpectErrors('FROM index | RERANK "q" ON keywordField WITH{', [msg]);
    });

    test('WITH with empty map (WITH {})', () => {
      rerankExpectErrors('FROM index | RERANK "q" ON keywordField WITH { }', [msg]);
    });

    test('WITH map without inference_id key', () => {
      rerankExpectErrors('FROM index | RERANK "q" ON keywordField WITH { "some_param": "value" }', [
        msg,
      ]);
    });

    test('WITH inference_id with empty string value', () => {
      rerankExpectErrors('FROM index | RERANK "q" ON keywordField WITH { "inference_id": "" }', [
        msg,
      ]);
    });
  });
});
