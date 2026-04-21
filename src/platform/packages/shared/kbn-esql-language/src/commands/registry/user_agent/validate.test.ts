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

const userAgentExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'user_agent', validate);
};

describe('USER_AGENT Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('expression type', () => {
    it('accepts keyword fields', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField', []);
    });

    it('accepts text fields', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = textField', []);
    });

    it('raises error on numeric field', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = doubleField', [
        'USER_AGENT only supports values of type keyword, text. Found "doubleField" of type double',
      ]);
    });

    it('raises error on boolean field', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = booleanField', [
        'USER_AGENT only supports values of type keyword, text. Found "booleanField" of type boolean',
      ]);
    });

    it('raises error on integer literal', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = 10', [
        'USER_AGENT only supports values of type keyword, text. Found "10" of type integer',
      ]);
    });
  });

  describe('WITH map keys', () => {
    it('accepts valid map keys', () => {
      userAgentExpectErrors(
        'FROM a | USER_AGENT ua = keywordField WITH { "regex_file": "_default_" }',
        []
      );
      userAgentExpectErrors(
        'FROM a | USER_AGENT ua = keywordField WITH { "extract_device_type": true }',
        []
      );
      userAgentExpectErrors(
        'FROM a | USER_AGENT ua = keywordField WITH { "properties": ["name", "version"] }',
        []
      );
    });

    it('raises error on unknown map key', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField WITH { "unknown_key": "val" }', [
        'Unknown parameter "unknown_key".',
      ]);
    });
  });

  describe('WITH map value types', () => {
    it('raises error when extract_device_type is not boolean', () => {
      userAgentExpectErrors(
        'FROM a | USER_AGENT ua = keywordField WITH { "extract_device_type": "yes" }',
        [
          'Invalid type for parameter "extract_device_type". Expected type: boolean. Received: keyword.',
        ]
      );
    });

    it('raises error when regex_file is not a string', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField WITH { "regex_file": 42 }', [
        'Invalid type for parameter "regex_file". Expected type: keyword. Received: integer.',
      ]);
    });

    it('raises error when properties is a plain string instead of a list', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField WITH { "properties": "name" }', [
        'Invalid type for parameter "properties". Expected type: list. Received: keyword.',
      ]);
    });

    it('raises error when properties is a number instead of a list', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField WITH { "properties": 10 }', [
        'Invalid type for parameter "properties". Expected type: list. Received: integer.',
      ]);
    });

    it('raises error when properties is a boolean instead of a list', () => {
      userAgentExpectErrors('FROM a | USER_AGENT ua = keywordField WITH { "properties": true }', [
        'Invalid type for parameter "properties". Expected type: list. Received: boolean.',
      ]);
    });
  });
});
