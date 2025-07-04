/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLMessage, ESQLCommand, ESQLAst } from '../types';
import type { ISuggestionItem, ESQLFieldWithMetadata, ICommandCallbacks } from './types';

/**
 * Interface defining the methods that each ES|QL command should register.
 * These methods provide functionality specific to the command's behavior.
 *
 * @template TAST The type of the Abstract Syntax Tree (AST) that might be passed
 * to these methods for detailed analysis.
 * @template TContext The type of any additional context required by the methods.
 */
export interface ICommandMethods<TContext = any> {
  /**
   * Validates the given query string or AST snippet for the specific command.
   * @param command The parsed Abstract Syntax Tree for deeper semantic validation.
   * @param ast The full Abstract Syntax Tree of the ESQL query.
   * @param context Additional context needed for validation (e.g., available fields).
   * @returns Return an array of validation errors/warnings.
   */
  validate?: (command: ESQLCommand, ast: ESQLAst, context?: TContext) => ESQLMessage[];

  /**
   * Provides suggestions for autocompletion based on the current query context
   * and the command's syntax.
   * @param query The ESQL query string.
   * @param command The parsed Abstract Syntax Tree.
   * @param cursorPosition The current cursor position in the query string.
   * @param context Additional context for suggestions (e.g., available functions, field types).
   * @returns An array of suggested completion items.
   */
  autocomplete: (
    query: string,
    command: ESQLCommand,
    callbacks?: ICommandCallbacks,
    context?: TContext
  ) => Promise<ISuggestionItem[]>;

  /**
   * Determines the columns available or expected after this command in a query pipeline.
   * This is crucial for chaining commands and ensuring type compatibility.
   * @param query The ESQL query string.
   * @param command The parsed Abstract Syntax Tree.
   * @param previousColumns An array of columns inherited from the preceding command.
   * @param context Additional context (e.g., schema information).
   * @returns An array of column names or more detailed column definitions.
   */
  columnsAfter?: (
    command: ESQLCommand,
    previousColumns: ESQLFieldWithMetadata[],
    context?: TContext
  ) => ESQLFieldWithMetadata[];
}

export interface ICommandMetadata {
  preview?: boolean; // Optional property to indicate if the command is in preview mode
  description: string; // Optional property for a brief description of the command
  declaration: string; // The pattern for declaring this command statement. Displayed in the autocomplete.
  examples: string[]; // A list of examples of how to use the command. Displayed in the autocomplete.
  hidden?: boolean; // Optional property to indicate if the command should be hidden in UI
  types?: Array<{ name: string; description: string }>; // Optional property for command-specific types
}

/**
 * Interface defining the structure of a single registered command.
 */
export interface ICommand {
  name: string;
  methods: ICommandMethods;
  metadata: ICommandMetadata;
}

/**
 * Interface for the ESQL Command Registry, defining its public API.
 */
export interface ICommandRegistry {
  /**
   * Registers a new command with its associated methods.
   * @param command The ICommand object to register.
   */
  registerCommand(command: ICommand): void;

  /**
   * Retrieves the methods associated with a given command name.
   * @param commandName The name of the command to retrieve.
   * @returns The ICommandMethods object for the command, or undefined if not found.
   */
  getCommandMethods(commandName: string): ICommandMethods | undefined;

  /**
   * Retrieves all registered command names.
   * @returns An array of strings representing the names of all registered commands.
   */
  getAllCommandNames(): string[];
  /**
   * Retrieves a command by its name, including its methods and optional metadata.
   * @param commandName The name of the command to retrieve.
   * @returns The ICommand object if found, otherwise undefined.
   */
  getCommandByName(commandName: string): ICommand | undefined;
}

/**
 * Implementation of the ESQL Command Registry.
 * This class manages the registration, storage, and retrieval of ESQL command methods.
 */
export class CommandRegistry implements ICommandRegistry {
  private commands: Map<
    string,
    {
      methods: ICommandMethods;
      metadata: ICommandMetadata; // Optional metadata for the command
    }
  > = new Map();

  constructor() {
    this.commands = new Map<
      string,
      {
        methods: ICommandMethods;
        metadata: ICommandMetadata; // Optional metadata for the command
      }
    >();
  }

  /**
   * Registers a new command and its methods into the registry.
   * @param command The command object containing its name and methods.
   */
  public registerCommand(command: ICommand): void {
    if (!this.commands.has(command.name)) {
      this.commands.set(command.name, { methods: command.methods, metadata: command.metadata });
    }
  }

  /**
   * Retrieves the methods associated with a specific command name.
   * @param commandName The name of the command to look up.
   * @returns The ICommandMethods object if the command is found, otherwise undefined.
   */
  public getCommandMethods(commandName: string): ICommandMethods | undefined {
    return this.commands.get(commandName)?.methods;
  }

  /**
   * Returns a list of all command names currently registered in the registry.
   * @returns An array of command names.
   */
  public getAllCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Retrieves all registered commands, including their methods and metadata.
   * @returns An array of ICommand objects representing all registered commands.
   */
  public getAllCommands(): ICommand[] {
    return Array.from(this.commands.entries()).map(([name, { methods, metadata }]) => ({
      name,
      methods,
      metadata,
    }));
  }

  /**
   * Retrieves a command by its name, including its methods and optional metadata.
   * @param commandName The name of the command to retrieve.
   * @returns The ICommand object if found, otherwise undefined.
   */
  public getCommandByName(commandName: string): ICommand | undefined {
    const command = this.commands.get(commandName);
    return command
      ? {
          name: commandName,
          methods: command.methods,
          metadata: command.metadata,
        }
      : undefined;
  }
}
