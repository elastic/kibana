/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from './validate';
import { Parser } from '../../../parser';
import type { ESQLCommand, ESQLMessage } from '../../../types';

const setExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  const { root } = Parser.parse(query);
  const command = root.header?.find((cmd) => cmd.name === 'set') as unknown as ESQLCommand;
  if (!command) {
    throw new Error(`SET command not found in the parsed query`);
  }

  const result = validate(command, root.commands, context) as ESQLMessage[];

  const errors: string[] = [];
  result.forEach((error) => {
    errors.push(error.text);
  });
  expect(errors).toEqual(expectedErrors);
};

describe('SET Validation', () => {
  describe('SET <setting> = <value>', () => {
    test('no errors on valid setting names', () => {
      // Test with the current valid setting
      setExpectErrors('set project_routing = "value"', []);
      setExpectErrors('SET project_routing = "value"', []);
      setExpectErrors('set project_routing="value"', []);
    });

    test('no errors on valid setting with different value types', () => {
      setExpectErrors('set project_routing = "string_value"', []);
      setExpectErrors('set project_routing = 123', []);
      setExpectErrors('set project_routing = true', []);
    });

    test('errors on unknown setting names', () => {
      setExpectErrors('set unknown_setting = "value"', ['Unknown setting unknown_setting']);
    });
  });

  describe('Case sensitivity', () => {
    test('setting names are case sensitive', () => {
      // Only exact case matches should work
      setExpectErrors('set project_routing = "value"', []);

      // Different cases should fail
      setExpectErrors('set Project_Routing = "value"', ['Unknown setting Project_Routing']);

      setExpectErrors('set PROJECT_ROUTING = "value"', ['Unknown setting PROJECT_ROUTING']);

      setExpectErrors('set project_Routing = "value"', ['Unknown setting project_Routing']);
    });
  });
});
