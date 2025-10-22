/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MockedICommandCallbacks } from '../../../__tests__/context_fixtures';
import { getMockCallbacks, mockContext } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { parse } from '../../../parser';
import type { ESQLCommand } from '../../../types';
import { settings } from '../../../definitions/generated/settings';

const testSetAutocomplete = async (
  query: string,
  expectedSuggestions: string[],
  cursorPosition?: number,
  mockCallbacks: MockedICommandCallbacks = getMockCallbacks()
) => {
  const { root } = parse(query);
  const setCommand = root.header?.find((cmd) => cmd.name === 'set');
  if (!setCommand) {
    throw new Error('SET command not found in parsed query');
  }

  const suggestions = await autocomplete(
    query,
    setCommand as unknown as ESQLCommand,
    mockCallbacks,
    mockContext,
    cursorPosition ?? query.length
  );

  const suggestionTexts = suggestions.map((s) => s.text);
  expect(suggestionTexts.sort()).toEqual(expectedSuggestions.sort());
};

describe('SET Autocomplete', () => {
  describe('Setting name suggestions -- Serverless', () => {
    const mockCallbacks = { ...getMockCallbacks(), isServerless: true };
    const serverlessSettings = settings
      .filter((s) => s.serverlessOnly)
      .map((setting) => `${setting.name} = `);

    it('suggests available settings after SET command', async () => {
      await testSetAutocomplete('SET ', serverlessSettings, undefined, mockCallbacks);
    });

    it('suggests available settings with multiple spaces', async () => {
      await testSetAutocomplete('SET   ', serverlessSettings, undefined, mockCallbacks);
    });

    it('suggests available settings with tab characters', async () => {
      await testSetAutocomplete('SET\t', serverlessSettings, undefined, mockCallbacks);
    });

    it('suggests settings for partial setting name', async () => {
      await testSetAutocomplete('SET project', serverlessSettings, undefined, mockCallbacks);
    });

    it('suggests assignment operator after setting name', async () => {
      await testSetAutocomplete('SET project_routing ', ['= '], undefined, mockCallbacks);
    });
  });

  describe('Setting name suggestions -- Stateful', () => {
    const statefulSettings = settings
      .filter((s) => !s.serverlessOnly)
      .map((setting) => `${setting.name} = `);
    it('suggests stateful settings after SET command', async () => {
      await testSetAutocomplete('SET ', statefulSettings);
    });
  });

  describe('Setting value suggestions', () => {
    it('suggests nothing if setting name is unknown', async () => {
      await testSetAutocomplete('SET unknown_setting = ', []);
    });

    describe('Project routing setting', () => {
      it('suggests common project routing values after assignment operator', async () => {
        await testSetAutocomplete('SET project_routing = ', ['"_alias: *";', '"_alias:_origin";']);
      });

      it('suggests common project routing values for partial input', async () => {
        await testSetAutocomplete('SET project_routing = "_alias:', [
          '"_alias: *";',
          '"_alias:_origin";',
        ]);
      });
    });
  });

  describe('After setting assignment', () => {
    it('suggests semicolon with newline after complete binary expression', async () => {
      await testSetAutocomplete('SET project_routing = "some_value"', [';\n']);
    });

    it('suggests semicolon with newline after string value', async () => {
      await testSetAutocomplete('SET project_routing = "test"', [';\n']);
    });

    it('suggests semicolon with newline after boolean value', async () => {
      await testSetAutocomplete('SET project_routing = true', [';\n']);
    });

    it('suggests semicolon with newline after numeric value', async () => {
      await testSetAutocomplete('SET project_routing = 123', [';\n']);
    });
  });
});
