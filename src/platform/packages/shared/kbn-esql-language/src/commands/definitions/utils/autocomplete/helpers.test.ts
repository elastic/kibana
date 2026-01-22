/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendCommandToSuggestionItem } from './helpers';
import type { ISuggestionItem } from '../../../registry/types';

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
