/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { CommandRegistry, ICommand, ICommandMethods, ICommandMetadata } from './registry';
import { ItemKind } from './types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  // Helper function to create a mock command for testing
  const createMockCommand = (
    name: string,
    methods?: Partial<ICommandMethods>,
    metadata?: Partial<ICommandMetadata>
  ): ICommand => {
    const defaultMethods: ICommandMethods = {
      autocomplete: jest.fn(async () => []),
    };
    const defaultMetadata: ICommandMetadata = {
      description: `Description for ${name}`,
      declaration: `${name} declaration`,
      examples: [`${name} example`],
    };

    return {
      name,
      methods: { ...defaultMethods, ...methods } as ICommandMethods,
      metadata: { ...defaultMetadata, ...metadata } as ICommandMetadata,
    };
  };

  describe('registerCommand', () => {
    test('should register a new command successfully', () => {
      const command = createMockCommand('testCommand');
      registry.registerCommand(command);
      expect(registry.getCommandMethods('testCommand')).toBe(command.methods);
      expect(registry.getCommandByName('testCommand')).toEqual(command);
    });

    test('should not re-register an existing command', () => {
      const command1 = createMockCommand('duplicateCommand', {
        autocomplete: jest.fn(async () => [
          {
            text: 'suggestion1',
            label: 'suggestion1',
            kind: 'keyword' as ItemKind,
            detail: 'detail',
          },
        ]),
      });
      const command2 = createMockCommand('duplicateCommand', {
        autocomplete: jest.fn(async () => [
          {
            text: 'suggestion2',
            label: 'suggestion2',
            kind: 'keyword' as ItemKind,
            detail: 'detail',
          },
        ]),
      });

      registry.registerCommand(command1);
      registry.registerCommand(command2); // Try to register again

      const retrievedCommand = registry.getCommandByName('duplicateCommand');
      expect(retrievedCommand?.methods.autocomplete).toBe(command1.methods.autocomplete); // Should still be command1's methods
      expect(retrievedCommand?.methods.autocomplete).not.toBe(command2.methods.autocomplete);
    });

    test('should register command with all optional methods and metadata', () => {
      const mockValidate = jest.fn(() => []);
      const mockColumnsAfter = jest.fn(() => []);
      const command = createMockCommand(
        'fullCommand',
        {
          validate: mockValidate,
          columnsAfter: mockColumnsAfter,
        },
        {
          preview: true,
          hidden: true,
          types: [{ name: 'type1', description: 'desc1' }],
        }
      );
      registry.registerCommand(command);

      const retrievedCommand = registry.getCommandByName('fullCommand');
      expect(retrievedCommand).toBeDefined();
      expect(retrievedCommand?.methods.validate).toBe(mockValidate);
      expect(retrievedCommand?.methods.columnsAfter).toBe(mockColumnsAfter);
      expect(retrievedCommand?.metadata.preview).toBe(true);
      expect(retrievedCommand?.metadata.hidden).toBe(true);
      expect(retrievedCommand?.metadata.types).toEqual([{ name: 'type1', description: 'desc1' }]);
    });
  });

  describe('getCommandMethods', () => {
    test('should return methods for a registered command', () => {
      const command = createMockCommand('getMethodsCommand');
      registry.registerCommand(command);
      const methods = registry.getCommandMethods('getMethodsCommand');
      expect(methods).toBe(command.methods);
    });

    test('should return undefined for an unregistered command', () => {
      const methods = registry.getCommandMethods('nonExistentCommand');
      expect(methods).toBeUndefined();
    });
  });

  describe('getAllCommandNames', () => {
    test('should return an empty array when no commands are registered', () => {
      expect(registry.getAllCommandNames()).toEqual([]);
    });

    test('should return all registered command names', () => {
      registry.registerCommand(createMockCommand('commandA'));
      registry.registerCommand(createMockCommand('commandB'));
      registry.registerCommand(createMockCommand('commandC'));
      const names = registry.getAllCommandNames();
      expect(names).toEqual(expect.arrayContaining(['commandA', 'commandB', 'commandC']));
      expect(names.length).toBe(3);
    });

    test('should return unique command names even if attempted to register duplicates', () => {
      registry.registerCommand(createMockCommand('uniqueCommand'));
      registry.registerCommand(createMockCommand('uniqueCommand')); // Attempt to duplicate
      expect(registry.getAllCommandNames()).toEqual(['uniqueCommand']);
    });
  });

  describe('getCommandByName', () => {
    test('should return the full command object for a registered command', () => {
      const command = createMockCommand(
        'fullObjectCommand',
        {
          autocomplete: jest.fn(async () => []),
        },
        {
          description: 'Test description',
        }
      );
      registry.registerCommand(command);
      const retrievedCommand = registry.getCommandByName('fullObjectCommand');
      expect(retrievedCommand).toEqual(command);
    });

    test('should return undefined for an unregistered command', () => {
      const retrievedCommand = registry.getCommandByName('unknownCommand');
      expect(retrievedCommand).toBeUndefined();
    });
  });

  describe('getAllCommands', () => {
    test('should return an empty array when no commands are registered', () => {
      expect(registry.getAllCommands()).toEqual([]);
    });

    test('should return all registered command objects', () => {
      const command1 = createMockCommand('cmd1');
      const command2 = createMockCommand('cmd2');
      registry.registerCommand(command1);
      registry.registerCommand(command2);

      const allCommands = registry.getAllCommands();
      expect(allCommands.length).toBe(2);
      expect(allCommands).toEqual(expect.arrayContaining([command1, command2]));
    });

    test('should not return duplicate commands even if attempted to register duplicates', () => {
      const command1 = createMockCommand('duplicateTest');
      const command2 = createMockCommand('duplicateTest', {
        autocomplete: jest.fn(async () => [
          {
            text: 'another',
            label: 'another',
            kind: 'keyword' as ItemKind,
            detail: 'detail',
          },
        ]),
      });
      registry.registerCommand(command1);
      registry.registerCommand(command2); // Attempt to duplicate

      const allCommands = registry.getAllCommands();
      expect(allCommands.length).toBe(1);
      expect(allCommands[0]).toEqual(command1); // Should be the first registered command
    });
  });
});
