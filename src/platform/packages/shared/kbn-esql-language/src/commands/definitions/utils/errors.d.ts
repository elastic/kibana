import type { ESQLAstAllCommands, ESQLColumn, ESQLCommand, ESQLFunction, ESQLIdentifier, ESQLLocation, ESQLSource } from '@elastic/esql/types';
import type { ErrorTypes, ErrorValues, ESQLMessage, FunctionDefinition, Signature, SupportedDataType } from '../types';
export declare function getMessageFromId<K extends ErrorTypes>({ locations, ...payload }: {
    messageId: K;
    values: ErrorValues<K>;
    locations: ESQLLocation;
}): ESQLMessage;
export declare function createMessage(type: ESQLMessage['type'], message: string, location: ESQLMessage['location'], messageId: string, underlinedWarning?: ESQLMessage['underlinedWarning']): ESQLMessage;
/**
 * Tags an error as semantic, indicating it requires runtime data to validate.
 *
 * Semantic errors depend on external data (indices, columns, policies) that can only
 * be determined at runtime. When the required callback is not available, these errors
 * will be filtered out during validation to avoid false positives.
 *
 * This is the core mechanism of the Error Tagging system, which eliminates the need
 * for manual maintenance of error-to-callback mappings.
 *
 * @param error - The base error message to tag
 * @param requiresCallback - The name of the callback required to validate this error
 *                          Common values: 'getColumnsFor', 'getSources', 'getPolicies', 'getJoinIndices'
 * @returns The error with semantic metadata attached
 *
 * @example
 * ```typescript
 * // Error that requires column information
 * unknownColumn: (column) =>
 *   tagSemanticError(
 *     errors.byId('unknownColumn', column.location, { name: column.name }),
 *     'getColumnsFor'  // Will be filtered if getColumnsFor callback is missing
 *   )
 * ```
 */
export declare function tagSemanticError(error: ESQLMessage, requiresCallback: string): ESQLMessage;
export declare const errors: {
    unexpected: (location: ESQLLocation, message?: string) => ESQLMessage;
    byId: <K extends ErrorTypes>(id: K, location: ESQLLocation, values: ErrorValues<K>) => ESQLMessage;
    unknownFunction: (fn: ESQLFunction) => ESQLMessage;
    unknownColumn: (column: ESQLColumn | ESQLIdentifier) => ESQLMessage;
    unmappedColumnWarning: (column: ESQLColumn | ESQLIdentifier) => ESQLMessage;
    unknownIndex: (source: ESQLSource) => ESQLMessage;
    unknownDataSource: (source: ESQLSource) => ESQLMessage;
    unknownPolicy: (policyName: string, location: ESQLLocation) => ESQLMessage;
    unknownCastingType: (castType: string, location: ESQLLocation) => ESQLMessage;
    invalidInlineCast: (castType: string, valueType: string, location: ESQLLocation) => ESQLMessage;
    tooManyForks: (command: ESQLCommand) => ESQLMessage;
    nestedAggFunction: (fn: ESQLFunction, parentName: string) => ESQLMessage;
    expectedAggregationArgument: (parentFn: ESQLFunction, location?: ESQLLocation) => ESQLMessage;
    unknownAggFunction: (node: ESQLColumn | ESQLIdentifier, type?: string) => ESQLMessage;
    invalidJoinIndex: (identifier: ESQLSource) => ESQLMessage;
    joinOnSingleExpression: (location: ESQLLocation) => ESQLMessage;
    noMatchingCallSignature: (fn: ESQLFunction, definition: FunctionDefinition, argTypes: string[]) => ESQLMessage;
    licenseRequired: (fn: ESQLFunction, license: string) => ESQLMessage;
    licenseRequiredForSignature: (fn: ESQLFunction, signature: Signature) => ESQLMessage;
    functionNotAllowedHere: (fn: ESQLFunction, locationName: string) => ESQLMessage;
    tsdbIncompatibleFunction: (fn: ESQLFunction) => ESQLMessage;
    wrongNumberArgs: (fn: ESQLFunction, definition: FunctionDefinition) => ESQLMessage;
    changePointWrongFieldType: ({ location, name }: ESQLColumn, type: SupportedDataType | "unknown") => ESQLMessage;
    unsupportedFieldType: (column: ESQLColumn | ESQLIdentifier, field: string, shouldWarn?: boolean) => ESQLMessage;
    columnTypeConflict: (column: ESQLColumn | ESQLIdentifier, columnName: string, types: string[], shouldWarn?: boolean) => ESQLMessage;
    dropTimestampWarning: ({ location }: ESQLColumn) => ESQLMessage;
    forkTooManyBranches: (command: ESQLAstAllCommands) => ESQLMessage;
    forkNotAllowedWithSubqueries: (command: ESQLAstAllCommands) => ESQLMessage;
};
export declare const buildSignatureTypes: (sig: Signature) => string;
