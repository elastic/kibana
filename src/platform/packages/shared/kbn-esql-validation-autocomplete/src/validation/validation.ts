/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AstProviderFn,
  ESQLAst,
  ESQLAstMetricsCommand,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLMessage,
  ESQLSource,
  isIdentifier,
  walk,
} from '@kbn/esql-ast';
import type { ESQLAstJoinCommand, ESQLIdentifier } from '@kbn/esql-ast/src/types';
import { compareTypesWithLiterals } from '../shared/esql_types';
import {
  areFieldAndVariableTypesCompatible,
  getColumnExists,
  getColumnForASTNode,
  getCommandDefinition,
  getQuotedColumnName,
  hasWildcard,
  isColumnItem,
  isFunctionItem,
  isOptionItem,
  isParametrized,
  isSourceItem,
  isTimeIntervalItem,
  isVariable,
  sourceExists,
} from '../shared/helpers';
import type { ESQLCallbacks } from '../shared/types';
import { collectVariables } from '../shared/variables';
import { errors, getMessageFromId } from './errors';
import { validateFunction } from './function_validation';
import {
  retrieveFields,
  retrieveFieldsFromStringSources,
  retrievePolicies,
  retrievePoliciesFields,
  retrieveSources,
} from './resources';
import type {
  ESQLRealField,
  ESQLVariable,
  ErrorTypes,
  ReferenceMaps,
  ValidationOptions,
  ValidationResult,
} from './types';

import { validate as validateJoinCommand } from './commands/join';
import { validate as validateMetricsCommand } from './commands/metrics';

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one from '@kbn/esql-validation-autocomplete' will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 */
export async function validateQuery(
  queryString: string,
  astProvider: AstProviderFn,
  options: ValidationOptions = {},
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const result = await validateAst(queryString, astProvider, callbacks);
  // early return if we do not want to ignore errors
  if (!options.ignoreOnMissingCallbacks) {
    return result;
  }
  const finalCallbacks = callbacks || {};
  const errorTypoesToIgnore = Object.entries(ignoreErrorsMap).reduce((acc, [key, errorCodes]) => {
    if (
      !(key in finalCallbacks) ||
      (key in finalCallbacks && finalCallbacks[key as keyof ESQLCallbacks] == null)
    ) {
      for (const e of errorCodes) {
        acc[e] = true;
      }
    }
    return acc;
  }, {} as Partial<Record<ErrorTypes, boolean>>);
  const filteredErrors = result.errors
    .filter((error) => {
      if ('severity' in error) {
        return true;
      }
      return !errorTypoesToIgnore[error.code as ErrorTypes];
    })
    .map((error) =>
      'severity' in error
        ? {
            text: error.message,
            code: error.code!,
            type: 'error' as const,
            location: { min: error.startColumn, max: error.endColumn },
          }
        : error
    );
  return { errors: filteredErrors, warnings: result.warnings };
}

/**
 * @private
 */
export const ignoreErrorsMap: Record<keyof ESQLCallbacks, ErrorTypes[]> = {
  getColumnsFor: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  getPreferences: [],
  getFieldsMetadata: [],
  getVariables: [],
  canSuggestVariables: [],
  getJoinIndices: [],
};

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
async function validateAst(
  queryString: string,
  astProvider: AstProviderFn,
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const parsingResult = await astProvider(queryString);

  const { ast } = parsingResult;

  const [sources, availableFields, availablePolicies, joinIndices] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(ast, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, ast, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(ast, callbacks),
    // retrieve indices for join command
    callbacks?.getJoinIndices?.(),
  ]);

  if (availablePolicies.size) {
    const fieldsFromPoliciesMap = await retrievePoliciesFields(ast, availablePolicies, callbacks);
    fieldsFromPoliciesMap.forEach((value, key) => availableFields.set(key, value));
  }

  if (ast.some(({ name }) => ['grok', 'dissect'].includes(name))) {
    const fieldsFromGrokOrDissect = await retrieveFieldsFromStringSources(
      queryString,
      ast,
      callbacks
    );
    fieldsFromGrokOrDissect.forEach((value, key) => {
      // if the field is already present, do not overwrite it
      // Note: this can also overlap with some variables
      if (!availableFields.has(key)) {
        availableFields.set(key, value);
      }
    });
  }

  const variables = collectVariables(ast, availableFields, queryString);
  // notify if the user is rewriting a column as variable with another type
  messages.push(...validateFieldsShadowing(availableFields, variables));
  messages.push(...validateUnsupportedTypeFields(availableFields, ast));

  for (const [index, command] of ast.entries()) {
    const references: ReferenceMaps = {
      sources,
      fields: availableFields,
      policies: availablePolicies,
      variables,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
    };
    const commandMessages = validateCommand(command, references, ast, index);
    messages.push(...commandMessages);
  }

  return {
    errors: [...parsingResult.errors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}

function validateCommand(
  command: ESQLCommand,
  references: ReferenceMaps,
  ast: ESQLAst,
  currentCommandIndex: number
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (command.incomplete) {
    return messages;
  }
  // do not check the command exists, the grammar is already picking that up
  const commandDef = getCommandDefinition(command.name);

  if (!commandDef) {
    return messages;
  }

  if (commandDef.validate) {
    messages.push(...commandDef.validate(command, references));
  }

  switch (commandDef.name) {
    case 'metrics': {
      const metrics = command as ESQLAstMetricsCommand;
      const metricsCommandErrors = validateMetricsCommand(metrics, references);
      messages.push(...metricsCommandErrors);
      break;
    }
    case 'join': {
      const join = command as ESQLAstJoinCommand;
      const joinCommandErrors = validateJoinCommand(join, references);
      messages.push(...joinCommandErrors);
      break;
    }
    default: {
      // Now validate arguments
      for (const arg of command.args) {
        if (!Array.isArray(arg)) {
          if (isFunctionItem(arg)) {
            messages.push(
              ...validateFunction({
                fn: arg,
                parentCommand: command.name,
                parentOption: undefined,
                references,
                parentAst: ast,
                currentCommandIndex,
              })
            );
          } else if (isOptionItem(arg)) {
            messages.push(...validateOption(arg, command, references));
          } else if (isColumnItem(arg) || isIdentifier(arg)) {
            if (command.name === 'stats' || command.name === 'inlinestats') {
              messages.push(errors.unknownAggFunction(arg));
            } else {
              messages.push(...validateColumnForCommand(arg, command.name, references));
            }
          } else if (isTimeIntervalItem(arg)) {
            messages.push(
              getMessageFromId({
                messageId: 'unsupportedTypeForCommand',
                values: {
                  command: command.name.toUpperCase(),
                  type: 'date_period',
                  value: arg.name,
                },
                locations: arg.location,
              })
            );
          } else if (isSourceItem(arg)) {
            messages.push(...validateSource(arg, command.name, references));
          }
        }
      }
    }
  }

  // no need to check for mandatory options passed
  // as they are already validated at syntax level
  return messages;
}

function validateOption(
  option: ESQLCommandOption,
  command: ESQLCommand,
  referenceMaps: ReferenceMaps
): ESQLMessage[] {
  // check if the arguments of the option are of the correct type
  const messages: ESQLMessage[] = [];
  if (option.incomplete || command.incomplete || option.name === 'metadata') {
    return messages;
  }

  if (option.name === 'metadata') {
    // Validation for the metadata statement is handled in the FROM command's validate method
    return messages;
  }

  for (const arg of option.args) {
    if (Array.isArray(arg)) {
      continue;
    }
    if (isColumnItem(arg)) {
      messages.push(...validateColumnForCommand(arg, command.name, referenceMaps));
    } else if (isFunctionItem(arg)) {
      messages.push(
        ...validateFunction({
          fn: arg,
          parentCommand: command.name,
          parentOption: option.name,
          references: referenceMaps,
        })
      );
    }
  }

  return messages;
}

function validateFieldsShadowing(
  fields: Map<string, ESQLRealField>,
  variables: Map<string, ESQLVariable[]>
) {
  const messages: ESQLMessage[] = [];
  for (const variable of variables.keys()) {
    if (fields.has(variable)) {
      const variableHits = variables.get(variable)!;
      if (!areFieldAndVariableTypesCompatible(fields.get(variable)?.type, variableHits[0].type)) {
        const fieldType = fields.get(variable)!.type;
        const variableType = variableHits[0].type;
        const flatFieldType = fieldType;
        const flatVariableType = variableType;
        messages.push(
          getMessageFromId({
            messageId: 'shadowFieldType',
            values: {
              field: variable,
              fieldType: flatFieldType,
              newType: flatVariableType,
            },
            locations: variableHits[0].location,
          })
        );
      }
    }
  }

  return messages;
}

function validateUnsupportedTypeFields(fields: Map<string, ESQLRealField>, ast: ESQLAst) {
  const usedColumnsInQuery: string[] = [];

  walk(ast, {
    visitColumn: (node) => usedColumnsInQuery.push(node.name),
  });
  const messages: ESQLMessage[] = [];
  for (const column of usedColumnsInQuery) {
    if (fields.has(column) && fields.get(column)!.type === 'unsupported') {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedFieldType',
          values: {
            field: column,
          },
          locations: { min: 1, max: 1 },
        })
      );
    }
  }
  return messages;
}

export function validateSources(
  command: ESQLCommand,
  sources: ESQLSource[],
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  for (const source of sources) {
    messages.push(...validateSource(source, command.name, references));
  }

  return messages;
}

function validateSource(
  source: ESQLSource,
  commandName: string,
  { sources, policies }: ReferenceMaps
) {
  const messages: ESQLMessage[] = [];
  if (source.incomplete) {
    return messages;
  }

  const commandDef = getCommandDefinition(commandName);
  const isWildcardAndNotSupported =
    hasWildcard(source.name) && !commandDef.signature.params.some(({ wildcards }) => wildcards);
  if (isWildcardAndNotSupported) {
    messages.push(
      getMessageFromId({
        messageId: 'wildcardNotSupportedForCommand',
        values: { command: commandName.toUpperCase(), value: source.name },
        locations: source.location,
      })
    );
  } else {
    if (source.sourceType === 'index' && !sourceExists(source.name, sources)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownIndex',
          values: { name: source.name },
          locations: source.location,
        })
      );
    } else if (source.sourceType === 'policy' && !policies.has(source.name)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownPolicy',
          values: { name: source.name },
          locations: source.location,
        })
      );
    }
  }

  return messages;
}

export function validateColumnForCommand(
  column: ESQLColumn | ESQLIdentifier,
  commandName: string,
  references: ReferenceMaps
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];
  if (commandName === 'row') {
    if (!references.variables.has(column.name) && !isParametrized(column)) {
      messages.push(errors.unknownColumn(column));
    }
  } else {
    const columnName = getQuotedColumnName(column);
    if (getColumnExists(column, references)) {
      const commandDef = getCommandDefinition(commandName);
      const columnParamsWithInnerTypes = commandDef.signature.params.filter(
        ({ type, innerTypes }) => type === 'column' && innerTypes
      );
      // this should be guaranteed by the columnCheck above
      const columnRef = getColumnForASTNode(column, references)!;

      if (columnParamsWithInnerTypes.length) {
        const hasSomeWrongInnerTypes = columnParamsWithInnerTypes.every(
          ({ innerTypes }) =>
            innerTypes &&
            !innerTypes.includes('any') &&
            !innerTypes.some((type) => compareTypesWithLiterals(type, columnRef.type))
        );
        if (hasSomeWrongInnerTypes) {
          const supportedTypes: string[] = columnParamsWithInnerTypes
            .map(({ innerTypes }) => innerTypes)
            .flat()
            .filter((type) => type !== undefined) as string[];

          messages.push(
            getMessageFromId({
              messageId: 'unsupportedColumnTypeForCommand',
              values: {
                command: commandName.toUpperCase(),
                type: supportedTypes.join(', '),
                typeCount: supportedTypes.length,
                givenType: columnRef.type,
                column: columnName,
              },
              locations: column.location,
            })
          );
        }
      }
      if (
        hasWildcard(columnName) &&
        !isVariable(columnRef) &&
        !commandDef.signature.params.some(({ type, wildcards }) => type === 'column' && wildcards)
      ) {
        messages.push(
          getMessageFromId({
            messageId: 'wildcardNotSupportedForCommand',
            values: {
              command: commandName.toUpperCase(),
              value: columnName,
            },
            locations: column.location,
          })
        );
      }
    } else {
      if (column.name) {
        messages.push(errors.unknownColumn(column));
      }
    }
  }
  return messages;
}
