/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendCommandToSuggestionItem, getSafeInsertText } from './helpers';
import type { ISuggestionItem } from '../../../registry/types';

describe('getSafeInsertText', () => {
  it('escapes invalid segments in a column path', () => {
    expect(getSafeInsertText('system.cpu.load_average.1')).toBe('system.cpu.load_average.`1`');
  });

  it('preserves dashes in contexts that support them', () => {
    expect(getSafeInsertText('my-policy', { dashSupported: true })).toBe('my-policy');
  });

  it('quotes an expression-derived column name as a single identifier', () => {
    expect(getSafeInsertText('host.cpu.pct > 0.5', { asExpression: true })).toBe(
      '`host.cpu.pct > 0.5`'
    );
  });

  it('quotes a function-call expression-derived column name as a single identifier', () => {
    expect(getSafeInsertText('ROUND(system.cpu.total.pct)', { asExpression: true })).toBe(
      '`ROUND(system.cpu.total.pct)`'
    );
  });

  it('quotes a name that matches a keyword', () => {
    expect(getSafeInsertText('true')).toBe('`true`');
  });

  it('leaves a normal dotted path unchanged', () => {
    expect(getSafeInsertText('host.name')).toBe('host.name');
  });

  it('preserves already-partially-escaped input passed directly', () => {
    expect(getSafeInsertText('system.cpu.load_average.`1`')).toBe('system.cpu.load_average.`1`');
  });

  it('preserves a user-defined column name that is already backtick-quoted', () => {
    expect(getSafeInsertText('`system.cpu 1m`', { asExpression: true })).toBe('`system.cpu 1m`');
  });

  it('preserves a user-defined column path with an escaped segment', () => {
    expect(getSafeInsertText('system.cpu.`1m`', { asExpression: true })).toBe('system.cpu.`1m`');
  });

  it('quotes an expression that contains an escaped field segment', () => {
    expect(getSafeInsertText('system.cpu.load_average.`1` < 0', { asExpression: true })).toBe(
      '`system.cpu.load_average.``1`` < 0`'
    );
  });

  it('escapes dotted field paths with spaces per segment', () => {
    expect(getSafeInsertText('cpu.test a.col.1m')).toBe('cpu.`test a`.col.`1m`');
  });

  it('quotes a flat field name with a space as a single identifier', () => {
    expect(getSafeInsertText('my field')).toBe('`my field`');
  });
});

describe('appendCommandToSuggestionItem', () => {
  it('should add a command to a suggestion item without a command', () => {
    const suggestionItem: ISuggestionItem = {
      label: 'test',
      text: 'test',
      kind: 'Value',
      detail: 'test',
    };
    const commandToAppend = {
      id: 'test.command',
      title: 'Test Command',
    };
    const result = appendCommandToSuggestionItem(suggestionItem, commandToAppend);
    expect(result.command).toEqual(commandToAppend);
  });

  it('should create a multi-command when the suggestion item already has a command', () => {
    const suggestionItem: ISuggestionItem = {
      label: 'test',
      text: 'test',
      kind: 'Value',
      detail: 'test',
      command: {
        id: 'existing.command',
        title: 'Existing Command',
      },
    };
    const commandToAppend = {
      id: 'test.command',
      title: 'Test Command',
    };
    const result = appendCommandToSuggestionItem(suggestionItem, commandToAppend);
    expect(result.command?.id).toBe('esql.multiCommands');
    const commands = JSON.parse(result.command?.arguments?.[0]?.commands || '[]');
    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual(suggestionItem.command);
    expect(commands[1]).toEqual(commandToAppend);
  });

  it('should append to existing multi-commands', () => {
    const existingCommand1 = { id: 'existing.command1', title: 'Existing Command 1' };
    const existingCommand2 = { id: 'existing.command2', title: 'Existing Command 2' };

    const suggestionItem: ISuggestionItem = {
      label: 'test',
      text: 'test',
      kind: 'Value',
      detail: 'test',
      command: {
        id: 'esql.multiCommands',
        title: 'Execute multiple commands',
        arguments: [
          {
            commands: JSON.stringify([existingCommand1, existingCommand2]),
          },
        ],
      },
    };

    const commandToAppend = {
      id: 'test.command',
      title: 'Test Command',
    };

    const result = appendCommandToSuggestionItem(suggestionItem, commandToAppend);

    expect(result.command?.id).toBe('esql.multiCommands');

    const commands = JSON.parse(result.command?.arguments?.[0]?.commands || '[]');
    expect(commands).toHaveLength(3);
    expect(commands[0]).toEqual(existingCommand1);
    expect(commands[1]).toEqual(existingCommand2);
    expect(commands[2]).toEqual(commandToAppend);
  });

  it('should not create a multi-command if the command to append is the same as the existing one', () => {
    const command = {
      id: 'test.command',
      title: 'Test Command',
    };
    const suggestionItem: ISuggestionItem = {
      label: 'test',
      text: 'test',
      kind: 'Value',
      detail: 'test',
      command,
    };
    const result = appendCommandToSuggestionItem(suggestionItem, command);
    expect(result.command).toEqual(command);
  });
});
