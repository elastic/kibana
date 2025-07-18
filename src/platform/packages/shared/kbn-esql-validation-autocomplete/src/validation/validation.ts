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
  ESQLCommand,
  ESQLMessage,
  EsqlQuery,
  walk,
  esqlCommandRegistry,
  ErrorTypes,
} from '@kbn/esql-ast';
import { getMessageFromId } from '@kbn/esql-ast/src/definitions/utils';
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
} from '@kbn/esql-ast/src/commands_registry/types';
import { areFieldAndUserDefinedColumnTypesCompatible } from '../shared/helpers';
import type { ESQLCallbacks } from '../shared/types';
import { collectUserDefinedColumns } from '../shared/user_defined_columns';
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

  const parsingResult = EsqlQuery.fromSrc(queryString);
  const rootCommands = parsingResult.ast.commands;

  const [sources, availableFields, availablePolicies, joinIndices] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(rootCommands, callbacks),
    // retrieve available fields (if a source command has been defined)
    retrieveFields(queryString, rootCommands, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(rootCommands, callbacks),
    // retrieve indices for join command
    callbacks?.getJoinIndices?.(),
  ]);

  if (availablePolicies.size) {
    const fieldsFromPoliciesMap = await retrievePoliciesFields(
      rootCommands,
      availablePolicies,
      callbacks
    );
    fieldsFromPoliciesMap.forEach((value, key) => availableFields.set(key, value));
  }

  if (rootCommands.some(({ name }) => ['grok', 'dissect'].includes(name))) {
    const fieldsFromGrokOrDissect = await retrieveFieldsFromStringSources(
      queryString,
      rootCommands,
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

  const userDefinedColumns = collectUserDefinedColumns(rootCommands, availableFields, queryString);
  // notify if the user is rewriting a column as userDefinedColumn with another type
  messages.push(...validateFieldsShadowing(availableFields, userDefinedColumns));
  messages.push(...validateUnsupportedTypeFields(availableFields, rootCommands));

  const references: ReferenceMaps = {
    sources,
    fields: availableFields,
    policies: availablePolicies,
    userDefinedColumns,
    query: queryString,
    joinIndices: joinIndices?.indices || [],
  };

  for (const [_, command] of rootCommands.entries()) {
    const commandMessages = validateCommand(command, references, rootCommands);
    messages.push(...commandMessages);
  }

  const parserErrors = parsingResult.errors;

  /**
   * Some changes to the grammar deleted the literal names for some tokens.
   * This is a workaround to restore the literals that were lost.
   *
   * See https://github.com/elastic/elasticsearch/pull/124177 for context.
   */
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
  ast: ESQLAst
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
    sources: [...references.sources].map((source) => ({
      name: source,
    })),
    joinSources: references.joinIndices,
  };

  if (commandDefinition.methods.validate) {
    messages.push(...commandDefinition.methods.validate(command, ast, context));
  }

  // no need to check for mandatory options passed
  // as they are already validated at syntax level
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
