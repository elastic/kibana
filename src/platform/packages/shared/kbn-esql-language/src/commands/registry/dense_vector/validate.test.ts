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

const denseVectorExpectErrors = (
  query: string,
  expectedErrors: string[],
  context = mockContext
) => {
  return expectErrors(query, expectedErrors, context, 'dense_vector', validate);
};

describe('DENSE_VECTOR Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic queries', () => {
    it('does not report errors for a single text field', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField', []);
    });

    it('does not report errors for a keyword field', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR keywordField', []);
    });

    it('does not report errors for several fields', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField, keywordField', []);
    });
  });

  describe('field type validation', () => {
    it('reports an error when a field is not text or keyword', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR integerField', [
        'DENSE_VECTOR only supports values of type text or keyword. Found "integerField" of type integer',
      ]);
    });

    it('reports an error for every offending field in the list', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR integerField, doubleField', [
        'DENSE_VECTOR only supports values of type text or keyword. Found "integerField" of type integer',
        'DENSE_VECTOR only supports values of type text or keyword. Found "doubleField" of type double',
      ]);
    });

    it('reports only the offending field in a mixed list', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField, integerField', [
        'DENSE_VECTOR only supports values of type text or keyword. Found "integerField" of type integer',
      ]);
    });

    it('reports an unknown column', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR noSuchField', [
        'Unknown column "noSuchField"',
      ]);
    });
  });

  describe('WITH map validation', () => {
    it('does not report errors for a valid WITH map', () => {
      denseVectorExpectErrors(
        'FROM index | DENSE_VECTOR textField WITH { "inference_id": "my-endpoint", "timeout": "10s" }',
        []
      );
    });

    it('does not report errors when the WITH map is omitted, since inference_id is optional', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField', []);
    });

    it('reports an unknown WITH parameter name', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField WITH { "test": 789 }', [
        'Unknown parameter "test".',
      ]);
    });

    it('reports a WITH parameter with a wrong value type', () => {
      denseVectorExpectErrors('FROM index | DENSE_VECTOR textField WITH { "timeout": true }', [
        'Invalid type for parameter "timeout". Expected type: keyword. Received: boolean.',
      ]);
    });
  });
});
