/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQLAst,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLMessage,
  ESQLSource,
  isIdentifier,
  parse,
  walk,
  esqlCommandRegistry,
  ErrorTypes,
} from '@kbn/esql-ast';
import { getMessageFromId, errors, sourceExists } from '@kbn/esql-ast/src/definitions/utils';
import type { ESQLIdentifier } from '@kbn/esql-ast/src/types';
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '@kbn/esql-ast/src/commands_registry/types';
import {
  areFieldAndUserDefinedColumnTypesCompatible,
  getColumnExists,
  hasWildcard,
  isColumnItem,
  isFunctionItem,
  isOptionItem,
  isParametrized,
  isSourceItem,
  isTimeIntervalItem,
} from '../shared/helpers';
import type { ESQLCallbacks } from '../shared/types';
import { collectUserDefinedColumns } from '../shared/user_defined_columns';
import { validateFunction } from './function_validation';
import {
  retrieveFields,
  retrieveFieldsFromStringSources,
  retrievePolicies,
  retrievePoliciesFields,
  retrieveSources,
} from './resources';
import type { ReferenceMaps, ValidationOptions, ValidationResult } from './types';

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one from '@kbn/esql-validation-autocomplete' will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 */
export async function validateQuery(
  queryString: string,
  options: ValidationOptions = {},
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const result = await validateAst(queryString, callbacks);
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
 * @internal
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
  getTimeseriesIndices: [],
  getEditorExtensions: [],
  getInferenceEndpoints: [],
};

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
async function validateAst(
  queryString: string,
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const parsingResult = parse(queryString);

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
      // Note: this can also overlap with some userDefinedColumns
      if (!availableFields.has(key)) {
        availableFields.set(key, value);
      }
    });
  }

  const userDefinedColumns = collectUserDefinedColumns(ast, availableFields, queryString);
  // notify if the user is rewriting a column as userDefinedColumn with another type
  messages.push(...validateFieldsShadowing(availableFields, userDefinedColumns));
  messages.push(...validateUnsupportedTypeFields(availableFields, ast));

  const references: ReferenceMaps = {
    sources,
    fields: availableFields,
    policies: availablePolicies,
    userDefinedColumns,
    query: queryString,
    joinIndices: joinIndices?.indices || [],
  };
  let seenFork = false;
  for (const [index, command] of ast.entries()) {
    if (command.name === 'fork') {
      if (seenFork) {
        messages.push(errors.tooManyForks(command));
      } else {
        seenFork = true;
      }
    }
    const commandMessages = validateCommand(command, references, ast, index);
    messages.push(...commandMessages);
  }

  const parserErrors = parsingResult.errors;

  for (const error of parserErrors) {
    error.message = error.message.replace(/\bLP\b/, "'('");
    error.message = error.message.replace(/\bOPENING_BRACKET\b/, "'['");
  }

  return {
    errors: [...parserErrors, ...messages.filter(({ type }) => type === 'error')],
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
  const commandDefinition = esqlCommandRegistry.getCommandByName(command.name);

  if (!commandDefinition) {
    return messages;
  }

  const context = {
    fields: references.fields,
    policies: references.policies,
    userDefinedColumns: references.userDefinedColumns,
    sources: references.sources,
    joinSources: references.joinIndices,
  };

  if (commandDefinition.methods.validate) {
    messages.push(...commandDefinition.methods.validate(command, ast, context));
  }

  switch (commandDefinition.name) {
    case 'join':
      break;
    case 'fork': {
      for (const arg of command.args.flat()) {
        if (!Array.isArray(arg) && arg.type === 'query') {
          // all the args should be commands
          arg.commands.forEach((subCommand) => {
            messages.push(...validateCommand(subCommand, references, ast, currentCommandIndex));
          });
        }
      }
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
          }
        }
      }

      const sources = command.args.filter((arg) => isSourceItem(arg)) as ESQLSource[];
      messages.push(...validateSources(sources, references));
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
  fields: Map<string, ESQLFieldWithMetadata>,
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>
) {
  const messages: ESQLMessage[] = [];
  for (const userDefinedColumn of userDefinedColumns.keys()) {
    if (fields.has(userDefinedColumn)) {
      const userDefinedColumnHits = userDefinedColumns.get(userDefinedColumn)!;
      if (
        !areFieldAndUserDefinedColumnTypesCompatible(
          fields.get(userDefinedColumn)?.type,
          userDefinedColumnHits[0].type
        )
      ) {
        const fieldType = fields.get(userDefinedColumn)!.type;
        const userDefinedColumnType = userDefinedColumnHits[0].type;
        const flatFieldType = fieldType;
        const flatUserDefinedColumnType = userDefinedColumnType;
        messages.push(
          getMessageFromId({
            messageId: 'shadowFieldType',
            values: {
              field: userDefinedColumn,
              fieldType: flatFieldType,
              newType: flatUserDefinedColumnType,
            },
            locations: userDefinedColumnHits[0].location,
          })
        );
      }
    }
  }

  return messages;
}

function validateUnsupportedTypeFields(fields: Map<string, ESQLFieldWithMetadata>, ast: ESQLAst) {
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
  sources: ESQLSource[],
  { sources: availableSources }: ReferenceMaps
) {
  const messages: ESQLMessage[] = [];

  const knownIndexNames = [];
  const knownIndexPatterns = [];
  const unknownIndexNames = [];
  const unknownIndexPatterns = [];

  for (const source of sources) {
    if (source.incomplete) {
      return messages;
    }

    if (source.sourceType === 'index') {
      const index = source.index;
      const sourceName = source.prefix ? source.name : index?.valueUnquoted;
      if (!sourceName) continue;

      if (sourceExists(sourceName, availableSources) && !hasWildcard(sourceName)) {
        knownIndexNames.push(source);
      }
      if (sourceExists(sourceName, availableSources) && hasWildcard(sourceName)) {
        knownIndexPatterns.push(source);
      }
      if (!sourceExists(sourceName, availableSources) && !hasWildcard(sourceName)) {
        unknownIndexNames.push(source);
      }
      if (!sourceExists(sourceName, availableSources) && hasWildcard(sourceName)) {
        unknownIndexPatterns.push(source);
      }
    }
  }

  unknownIndexNames.forEach((source) => {
    messages.push(
      getMessageFromId({
        messageId: 'unknownIndex',
        values: { name: source.name },
        locations: source.location,
      })
    );
  });

  if (knownIndexNames.length + unknownIndexNames.length + knownIndexPatterns.length === 0) {
    // only if there are no known index names, no known index patterns, and no unknown
    // index names do we worry about creating errors for unknown index patterns
    unknownIndexPatterns.forEach((source) => {
      messages.push(
        getMessageFromId({
          messageId: 'unknownIndex',
          values: { name: source.name },
          locations: source.location,
        })
      );
    });
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
    if (!references.userDefinedColumns.has(column.name) && !isParametrized(column)) {
      messages.push(errors.unknownColumn(column));
    }
  } else if (!getColumnExists(column, references) && !isParametrized(column)) {
    messages.push(errors.unknownColumn(column));
  }

  return messages;
}
