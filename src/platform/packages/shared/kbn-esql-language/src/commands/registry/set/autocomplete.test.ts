/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getMockCallbacks, mockContext } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import type { ICommandCallbacks } from '../types';
import { expectSuggestions } from '../../../__tests__/commands/autocomplete';
import { settings } from '../../definitions/generated/settings';

const setExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'set',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('SET Autocomplete', () => {
  describe('Setting name suggestions -- Serverless', () => {
    let mockCallbacks: ICommandCallbacks;
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset mocks before each test to ensure isolation
      mockCallbacks = getMockCallbacks();
      mockCallbacks.isServerless = true;
    });
    const serverlessSettings = settings
      .filter((s) => s.serverlessOnly)
      .map((setting) => `${setting.name} = `);

    it('suggests available settings after SET command', async () => {
      await setExpectSuggestions('SET ', serverlessSettings, mockCallbacks);
    });

    it('suggests available settings with multiple spaces', async () => {
      await setExpectSuggestions('SET   ', serverlessSettings, mockCallbacks);
    });

    it('suggests available settings with tab characters', async () => {
      await setExpectSuggestions('SET\t', serverlessSettings, mockCallbacks);
    });

    it('suggests settings for partial setting name', async () => {
      await setExpectSuggestions('SET project', serverlessSettings, mockCallbacks);
    });

    it('suggests assignment operator after setting name', async () => {
      await setExpectSuggestions('SET project_routing ', ['= '], mockCallbacks);
    });
  });

  describe('Setting name suggestions -- Stateful', () => {
    const statefulSettings = settings
      .filter((s) => !s.serverlessOnly)
      .filter((s) => !s.ignoreAsSuggestion)
      .map((setting) => `${setting.name} = `);
    it('suggests stateful settings after SET command', async () => {
      await setExpectSuggestions('SET ', statefulSettings);
    });
  });

  describe('Setting value suggestions', () => {
    it('suggests nothing if setting name is unknown', async () => {
      await setExpectSuggestions('SET unknown_setting = ', []);
    });

    describe('Project routing setting', () => {
      it('suggests common project routing values after assignment operator', async () => {
        await setExpectSuggestions('SET project_routing = ', ['"_alias: *";', '"_alias:_origin";']);
      });

      it('suggests common project routing values for partial input', async () => {
        await setExpectSuggestions('SET project_routing = "_alias:', [
          '_alias: *',
          '_alias:_origin',
        ]);
      });
    });

    describe('Unmapped fields setting', () => {
      it('suggests unmapped fields values after assignment operator', async () => {
        await setExpectSuggestions('SET unmapped_fields = ', ['"FAIL";', '"LOAD";', '"NULLIFY";']);
      });

      it('suggests unmapped fields values for partial input', async () => {
        await setExpectSuggestions('SET unmapped_fields = "N', ['FAIL', 'LOAD', 'NULLIFY']);
      });
    });
  });

  describe('After setting assignment', () => {
    it('suggests semicolon with newline after complete binary expression', async () => {
      await setExpectSuggestions('SET project_routing = "some_value"', [';\n']);
    });

    it('suggests semicolon with newline after string value', async () => {
      await setExpectSuggestions('SET project_routing = "test"', [';\n']);
    });

    it('suggests semicolon with newline after boolean value', async () => {
      await setExpectSuggestions('SET project_routing = true', [';\n']);
    });

    it('suggests semicolon with newline after numeric value', async () => {
      await setExpectSuggestions('SET project_routing = 123', [';\n']);
    });
  });
});
