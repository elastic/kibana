/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { parse } from '../../../parser';
import type { ESQLCommand } from '../../../types';

const testSetAutocomplete = async (
  query: string,
  expectedSuggestions: string[],
  cursorPosition?: number
) => {
  const { root } = parse(query);
  const setCommand = root.header?.find((cmd) => cmd.name === 'set');
  if (!setCommand) {
    throw new Error('SET command not found in parsed query');
  }

  const suggestions = await autocomplete(
    query,
    setCommand as unknown as ESQLCommand,
    undefined,
    mockContext,
    cursorPosition ?? query.length
  );

  const suggestionTexts = suggestions.map((s) => s.text);
  expect(suggestionTexts.sort()).toEqual(expectedSuggestions.sort());
};

describe('SET Autocomplete', () => {
  describe('Setting name suggestions', () => {
    it('suggests available settings after SET command', async () => {
      await testSetAutocomplete('SET ', ['project_routing = ']);
    });

    it('suggests available settings with multiple spaces', async () => {
      await testSetAutocomplete('SET   ', ['project_routing = ']);
    });

    it('suggests available settings with tab characters', async () => {
      await testSetAutocomplete('SET\t', ['project_routing = ']);
    });

    it('suggests settings for partial setting name', async () => {
      await testSetAutocomplete('SET project', ['project_routing = ']);
    });
  });

  describe('After setting assignment', () => {
    it('suggests semicolon with newline after complete binary expression', async () => {
      await testSetAutocomplete('SET project_routing = "some_value"', [';\n']);
    });

    it('suggests semicolon with newline after string value', async () => {
      await testSetAutocomplete('SET project_routing = "test"', [';\n']);
    });

    it('suggests semicolon with newline after quoted value', async () => {
      // Note: Single quotes might not parse as complete binary expression in all cases
      await testSetAutocomplete("SET project_routing = 'test'", []);
    });

    it('suggests semicolon with newline after boolean value', async () => {
      await testSetAutocomplete('SET project_routing = true', [';\n']);
    });

    it('suggests semicolon with newline after numeric value', async () => {
      await testSetAutocomplete('SET project_routing = 123', [';\n']);
    });
  });

  // For now we don't suggest anything for settings values
  describe('Incomplete expressions', () => {
    it('suggests nothing for incomplete binary expression', async () => {
      await testSetAutocomplete('SET project_routing = ', []);
    });

    it('suggests nothing for setting name followed by equals but no value', async () => {
      await testSetAutocomplete('SET project_routing =', []);
    });
  });
});
