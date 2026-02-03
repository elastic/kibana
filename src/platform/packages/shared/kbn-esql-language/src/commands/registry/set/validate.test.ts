/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { validate } from './validate';
import { Parser } from '../../../parser';
import type { ESQLMessage } from '../../../types';

const setExpectErrors = (query: string, expectedErrors: string[]) => {
  const { root } = Parser.parse(query);
  const command = root.header?.find((cmd) => cmd.name === 'set');
  if (!command) {
    throw new Error(`SET command not found in the parsed query`);
  }

  const result = validate(command, root.commands) as ESQLMessage[];

  const errors: string[] = [];
  result.forEach((error) => {
    errors.push(error.text);
  });
  expect(errors).toEqual(expectedErrors);
};

describe('SET Validation', () => {
  describe('SET <setting> = <value>', () => {
    test('no errors on valid setting names', () => {
      setExpectErrors('set time_zone = "value"', []);
      setExpectErrors('SET time_zone = "value"', []);
      setExpectErrors('set time_zone="value"', []);
    });

    test('no errors on valid setting with correct value type', () => {
      setExpectErrors('set time_zone = "string_value"', []);
    });

    test('errors on valid setting with incorrect value type', () => {
      setExpectErrors('set time_zone = 123', ['Invalid value "123" for setting "time_zone".']);
      setExpectErrors('set time_zone = true', ['Invalid value "true" for setting "time_zone".']);
    });

    test('errors on unknown setting names', () => {
      setExpectErrors('set unknown_setting = "value"', ['Unknown setting unknown_setting']);
    });
  });

  describe('Case sensitivity', () => {
    test('setting names are case sensitive', () => {
      // Only exact case matches should work
      setExpectErrors('set time_zone = "value"', []);

      // Different cases should fail
      setExpectErrors('set Time_Zone = "value"', ['Unknown setting Time_Zone']);

      setExpectErrors('set TIME_ZONE = "value"', ['Unknown setting TIME_ZONE']);

      setExpectErrors('set Project_Routing = "value"', ['Unknown setting Project_Routing']);

      setExpectErrors('set Approximation = "value"', ['Unknown setting Approximation']);

      setExpectErrors('set APPROXIMATION = "value"', ['Unknown setting APPROXIMATION']);
    });
  });

  describe('Setting: approximation', () => {
    test('no errors on approximation setting with boolean value', () => {
      setExpectErrors('set approximation = true', []);
      setExpectErrors('set approximation = false', []);
    });

    test('no errors on approximation setting with map_param value and valid parameters', () => {
      setExpectErrors('set approximation = { "num_rows": 1000, "confidence_level": 0.95 }', []);
    });

    test('errors on approximation setting with map_param value and invalid parameter name', () => {
      setExpectErrors('set approximation = { "invalid_param": 1000 }', [
        'Unknown parameter "invalid_param".',
      ]);
    });

    test('errors on approximation setting with map_param value and invalid parameter type', () => {
      setExpectErrors('set approximation = { "num_rows": "not_an_integer" }', [
        'Invalid type for parameter "num_rows". Expected type: integer. Received: keyword.',
      ]);
    });

    test('errors on approximation setting with invalid value type', () => {
      setExpectErrors('set approximation = "not_a_boolean_or_map"', [
        'Invalid value "not_a_boolean_or_map" for setting "approximation".',
      ]);
    });
  });
});
