import type { LicenseType } from '@kbn/licensing-types';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLCommand, ESQLAstAllCommands } from '@elastic/esql/types';
import type { ISuggestionItem, ICommandCallbacks, ICommandContext, ESQLColumnData, ESQLCommandSummary, UnmappedFieldsStrategy } from './types';
import type { ESQLMessage } from '../definitions/types';
/**
 * Interface defining the methods that each ES|QL command should register.
 * These methods provide functionality specific to the command's behavior.
 *
 * @template TContext The type of any additional context required by the methods.
 */
export interface ICommandMethods<TContext = ICommandContext> {
    /**
     * Validates the given query string or AST snippet for the specific command.
     * @param command The parsed Abstract Syntax Tree for deeper semantic validation.
     * @param ast The full Abstract Syntax Tree of the ESQL query.
     * @param context Additional context needed for validation (e.g., available fields).
     * @returns Return an array of validation errors/warnings.
     */
    validate?: (command: ESQLAstAllCommands, ast: ESQLCommand[], context?: TContext, callbacks?: ICommandCallbacks) => ESQLMessage[];
    /**
     * Provides suggestions for autocompletion based on the current query context
     * and the command's syntax.
     * @param query The ESQL query string.
     * @param command The parsed Abstract Syntax Tree.
     * @param cursorPosition The current cursor position in the query string.
     * @param context Additional context for suggestions (e.g., available functions, field types).
     * @param callbacks Optional callbacks for handling specific events during autocompletion.
     * @returns An array of suggested completion items.
     */
    autocomplete: (query: string, command: ESQLAstAllCommands, callbacks?: ICommandCallbacks, context?: TContext, cursorPosition?: number) => Promise<ISuggestionItem[]>;
    /**
     * Determines the columns available or expected after this command in a query pipeline.
     * This is crucial for chaining commands and ensuring type compatibility.
     * @param command The parsed Abstract Syntax Tree.
     * @param previousColumns An array of columns inherited from the preceding command.
     * @param query The ESQL query string.
     * @param context Additional context (e.g., schema information).
     * @returns An array of column names or more detailed column definitions.
     */
    columnsAfter?: (command: ESQLCommand, previousColumns: ESQLColumnData[], query: string, newFields: IAdditionalFields, unmappedFieldsStrategy: UnmappedFieldsStrategy) => Promise<ESQLColumnData[]> | ESQLColumnData[];
    /**
     * Returns useful information about the command.
     * @param command The parsed Abstract Syntax Tree.
     * @param query The ESQL query string.
     * @returns A summary object containing details about the command.
     */
    summary?: (command: ESQLCommand, query: string) => ESQLCommandSummary;
}
export interface ICommandMetadata {
    preview?: boolean;
    description: string;
    declaration: string;
    examples: string[];
    hidden?: boolean;
    types?: Array<{
        name: string;
        description: string;
    }>;
    license?: LicenseType;
    observabilityTier?: string;
    type?: 'source' | 'header' | 'processing';
    isTimeseries?: boolean;
    requiresTimeseriesSource?: boolean;
    hiddenAfterCommands?: string[];
    subquerySupport?: boolean;
    subquerySource?: boolean;
    subquerySourceHidden?: boolean;
    subqueryRestrictions?: {
        hideInside: boolean;
        hideOutside: boolean;
    };
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
     * Retrieves the names of source commands (commands that can start a query).
     * @returns An array of source command names.
     */
    getSourceCommandNames(): string[];
    /**
     * Retrieves the names of processing commands (commands that transform data).
     * @returns An array of processing command names.
     */
    getProcessingCommandNames(): string[];
    /**
     * Retrieves the names of timeseries source commands.
     * @returns An array of timeseries command names.
     */
    getTimeseriesCommandNames(): string[];
    /**
     * Retrieves a command by its name, including its methods and optional metadata.
     * @param commandName The name of the command to retrieve.
     * @returns The ICommand object if found, otherwise undefined.
     */
    getCommandByName(commandName: string): ICommand | undefined;
}
export interface IAdditionalFields {
    fromJoin: (cmd: ESQLCommand) => Promise<ESQLFieldWithMetadata[]>;
    fromEnrich: (cmd: ESQLCommand) => Promise<ESQLFieldWithMetadata[]>;
    fromFrom: (cmd: ESQLCommand) => Promise<ESQLFieldWithMetadata[]>;
    fromPromql?: (cmd: ESQLCommand) => Promise<ESQLFieldWithMetadata[]>;
}
/**
 * Implementation of the ESQL Command Registry.
 * This class manages the registration, storage, and retrieval of ESQL command methods.
 */
export declare class CommandRegistry implements ICommandRegistry {
    private commands;
    private sourceCommandNames;
    private processingCommandNames;
    private timeseriesCommandNames;
    constructor();
    /**
     * Registers a new command and its methods into the registry.
     * @param command The command object containing its name and methods.
     */
    registerCommand(command: ICommand): void;
    /**
     * Retrieves the methods associated with a specific command name.
     * @param commandName The name of the command to look up.
     * @returns The ICommandMethods object if the command is found, otherwise undefined.
     */
    getCommandMethods(commandName: string): ICommandMethods | undefined;
    /**
     * Returns a list of all command names currently registered in the registry.
     * @returns An array of command names.
     */
    getAllCommandNames(): string[];
    /**
     * Retrieves the names of source commands (commands that can start a query).
     * @returns An array of source command names.
     */
    getSourceCommandNames(): string[];
    /**
     * Retrieves the names of processing commands (commands that transform data).
     * @returns An array of processing command names.
     */
    getProcessingCommandNames(): string[];
    /**
     * Retrieves the names of timeseries source commands.
     * @returns An array of timeseries command names.
     */
    getTimeseriesCommandNames(): string[];
    /**
     * Retrieves all registered commands, including their methods and metadata.
     * Filters commands based on subquery context and restrictions.
     * @returns An array of ICommand objects representing all registered commands.
     */
    getAllCommands(options?: {
        isCursorInSubquery?: boolean;
        isStartingSubquery?: boolean;
        queryContainsSubqueries?: boolean;
    }): ICommand[];
    /**
     * Retrieves a command by its name, including its methods and optional metadata.
     * @param commandName The name of the command to retrieve.
     * @returns The ICommand object if found, otherwise undefined.
     */
    getCommandByName(commandName: string): ICommand | undefined;
}
