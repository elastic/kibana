/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { FunctionDefinitionTypes } from '@kbn/esql-ast';
import { Location } from '@kbn/esql-ast/src/commands_registry/types';
import { setTestFunctions } from '@kbn/esql-ast/src/__tests__/utils';
import { setup } from './helpers';

describe('hidden commands', () => {
  it('does not suggest hidden commands', async () => {
    const { suggest } = await setup();
    const suggestedCommands = (await suggest('FROM index | /')).map((s) => s.text);
    expect(suggestedCommands).not.toContain('HIDDEN_COMMAND ');
    expect(suggestedCommands).toContain('EVAL ');
    expect(suggestedCommands.every((s) => !s.toLowerCase().includes('HIDDEN_COMMAND'))).toBe(true);
  });
});

describe('hidden functions', () => {
  afterEach(() => {
    setTestFunctions([]);
  });

  it('does not suggest hidden scalar functions', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'HIDDEN_FUNCTION',
        description: 'This is a hidden function',
        signatures: [{ params: [], returnType: 'text' }],
        locationsAvailable: [Location.EVAL],
        ignoreAsSuggestion: true,
      },
      {
        type: FunctionDefinitionTypes.SCALAR,
        name: 'VISIBLE_FUNCTION',
        description: 'This is a visible function',
        signatures: [{ params: [], returnType: 'text' }],
        locationsAvailable: [Location.EVAL],
        ignoreAsSuggestion: false,
      },
    ]);

    const { suggest } = await setup();
    const suggestedFunctions = (await suggest('FROM index | EVAL /')).map((s) => s.text);
    expect(suggestedFunctions).toContain('VISIBLE_FUNCTION($0)');
    expect(suggestedFunctions).not.toContain('HIDDEN_FUNCTION($0)');
  });

  it('does not suggest hidden agg functions', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.AGG,
        name: 'HIDDEN_FUNCTION',
        description: 'This is a hidden function',
        signatures: [{ params: [], returnType: 'text' }],
        locationsAvailable: [Location.STATS],
        ignoreAsSuggestion: true,
      },
      {
        type: FunctionDefinitionTypes.AGG,
        name: 'VISIBLE_FUNCTION',
        description: 'This is a visible function',
        signatures: [{ params: [], returnType: 'text' }],
        locationsAvailable: [Location.STATS],
        ignoreAsSuggestion: false,
      },
    ]);

    const { suggest } = await setup();
    const suggestedFunctions = (await suggest('FROM index | STATS /')).map((s) => s.text);
    expect(suggestedFunctions).toContain('VISIBLE_FUNCTION($0)');
    expect(suggestedFunctions).not.toContain('HIDDEN_FUNCTION($0)');
  });

  it('does not suggest hidden operators', async () => {
    setTestFunctions([
      {
        type: FunctionDefinitionTypes.OPERATOR,
        name: 'HIDDEN_OPERATOR',
        description: 'This is a hidden function',
        locationsAvailable: [
          Location.EVAL,
          Location.WHERE,
          Location.ROW,
          Location.SORT,
          Location.STATS_BY,
        ],
        ignoreAsSuggestion: true,
        signatures: [
          {
            params: [
              { name: 'left', type: 'keyword' as const },
              { name: 'right', type: 'keyword' as const },
            ],
            returnType: 'boolean',
          },
        ],
      },
      {
        type: FunctionDefinitionTypes.OPERATOR,
        name: 'VISIBLE_OPERATOR',
        description: 'This is a visible function',
        locationsAvailable: [
          Location.EVAL,
          Location.WHERE,
          Location.ROW,
          Location.SORT,
          Location.STATS_BY,
        ],
        ignoreAsSuggestion: false,
        signatures: [
          {
            params: [
              { name: 'left', type: 'keyword' as const },
              { name: 'right', type: 'keyword' as const },
            ],
            returnType: 'boolean',
          },
        ],
      },
    ]);

    const { suggest } = await setup();
    const suggestedFunctions = (await suggest('FROM index | EVAL keywordField /')).map(
      (s) => s.text
    );
    expect(suggestedFunctions).toContain('VISIBLE_OPERATOR $0');
    expect(suggestedFunctions).not.toContain('HIDDEN_OPERATOR $0');
  });
});
