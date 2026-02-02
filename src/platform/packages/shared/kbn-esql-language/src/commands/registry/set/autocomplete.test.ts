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
import { parseMapParams } from '../../definitions/utils/maps';
import { Settings } from '../../definitions/keywords';

jest.mock('../../definitions/generated/settings', () => {
  const originalModule = jest.requireActual('../../definitions/generated/settings');
  return {
    ...originalModule,
    settings: originalModule.settings.map((s: any) =>
      s.name === 'project_routing' ? { ...s, ignoreAsSuggestion: false } : s
    ),
  };
});

const setExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  caret = '^'
) => {
  const pos = query.indexOf(caret);
  if (pos > -1) {
    query = query.replace(caret, '');
  }

  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'set',
    mockCallbacks,
    autocomplete,
    pos > -1 ? pos : undefined
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
        await setExpectSuggestions('SET project_routing = ', ['"_alias:*";', '"_alias:_origin";']);
      });

      it('suggests common project routing values for partial input', async () => {
        await setExpectSuggestions('SET project_routing = "_alias:', [
          '_alias:*',
          '_alias:_origin',
        ]);
      });
    });

    it('suggests the value without semicolon if already present in the query', async () => {
      await setExpectSuggestions('SET project_routing = ^;', ['"_alias:*"', '"_alias:_origin"']);
      await setExpectSuggestions('SET project_routing = ^ ;', ['"_alias:*"', '"_alias:_origin"']);
    });

    describe('Unmapped fields setting', () => {
      it('suggests unmapped fields values after assignment operator', async () => {
        await setExpectSuggestions('SET unmapped_fields = ', ['"FAIL";', '"NULLIFY";']);
      });

      it('suggests unmapped fields values for partial input', async () => {
        await setExpectSuggestions('SET unmapped_fields = "N', ['FAIL', 'NULLIFY']);
      });
    });

    describe('Approximation setting', () => {
      const setting = settings.find((s) => s.name === Settings.APPROXIMATION) as unknown as {
        mapParams: string;
      };
      it('suggests parameter names after assignment operator', async () => {
        await setExpectSuggestions('SET approximation = ', ['false;', 'true;', '{ $0 };']);
      });

      it('suggests map parameter names after selecting the map option', async () => {
        const parameters = parseMapParams(setting?.mapParams || '');
        const paramNames = Object.keys(parameters).map((paramName) => `"${paramName}": `);
        await setExpectSuggestions('SET approximation = { ', paramNames);
      });

      it('suggests map parameter name after completing a parameter entry', async () => {
        await setExpectSuggestions('SET approximation = { "num_rows": 100, ', [
          '"confidence_level": ',
        ]);
      });

      it('suggests map parameter values after parameter name and colon: num_rows', async () => {
        await setExpectSuggestions('SET approximation = { "num_rows": ', [
          '100000',
          '1000000',
          '500000',
        ]);
      });

      it('suggests map parameter values after parameter name and colon:confidence_level', async () => {
        await setExpectSuggestions('SET approximation = { "confidence_level": ', [
          '0.99',
          '0.95',
          '0.9',
        ]);
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

    it('does not suggest semicolon if already present in the query', async () => {
      await setExpectSuggestions('SET project_routing = 123^;', []);
      await setExpectSuggestions('SET project_routing = 123^ ;', []);
      await setExpectSuggestions('SET project_routing = 123 ^ ;', []);
    });
  });
});
