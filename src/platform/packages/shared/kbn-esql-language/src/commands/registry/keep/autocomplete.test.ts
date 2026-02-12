/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';

const keepExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'keep',
    mockCallbacks,
    autocomplete
  );
};

describe('KEEP Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suggests available fields after KEEP', async () => {
    const columns = mockContext.columns;

    keepExpectSuggestions(
      'FROM a | KEEP ',
      Array.from(columns.values()).map((column) => column.name)
    );
  });

  it('suggests command and pipe after a field has been used in KEEP', async () => {
    keepExpectSuggestions('FROM logs* | KEEP doubleField ', ['| ', ',']);
  });

  it('prepends the fields browser suggestion when enabled', async () => {
    const result = await autocomplete(
      'FROM a | KEEP ',
      { args: [] } as any,
      { getByType: jest.fn(async () => []) } as any,
      { ...mockContext, isFieldsBrowserEnabled: true } as any,
      'FROM a | KEEP '.length
    );

    const containsFieldsBrowserCommand = result.some((s) => {
      const cmd = s.command;
      if (!cmd) return false;

      if (cmd.id === 'esql.fieldsBrowser.open') return true;

      if (cmd.id === 'esql.multiCommands') {
        const payload = cmd.arguments?.[0]?.commands;
        if (!payload) return false;
        const commands = JSON.parse(payload) as Array<{ id: string }>;
        return commands.some((c) => c.id === 'esql.fieldsBrowser.open');
      }

      return false;
    });

    expect(containsFieldsBrowserCommand).toBe(true);
  });
});
