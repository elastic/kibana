/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAst,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLMessage,
  ErrorTypes,
} from '@kbn/esql-ast';
import { EsqlQuery, walk, esqlCommandRegistry, Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import { getMessageFromId } from '@kbn/esql-ast/src/definitions/utils';
import type {
  ESQLFieldWithMetadata,
  ICommandCallbacks,
} from '@kbn/esql-ast/src/commands_registry/types';
import type { LicenseType } from '@kbn/licensing-types';

import type { ESQLCallbacks } from '../shared/types';
import { retrievePolicies, retrieveSources } from './resources';
import type { ReferenceMaps, ValidationOptions, ValidationResult } from './types';
import { getQueryForFields } from '../autocomplete/helper';
import { getColumnsByTypeHelper } from '../shared/resources_helpers';

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
  getColumnsFor: ['unknownColumn', 'unsupportedFieldType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  getPreferences: [],
  getFieldsMetadata: [],
  getVariables: [],
  canSuggestVariables: [],
  getJoinIndices: ['invalidJoinIndex'],
  getTimeseriesIndices: ['unknownIndex'],
  getEditorExtensions: [],
  getInferenceEndpoints: [],
  getLicense: [],
  getActiveProduct: [],
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

  const [sources, availablePolicies, joinIndices] = await Promise.all([
    // retrieve the list of available sources
    retrieveSources(rootCommands, callbacks),
    // retrieve available policies (if an enrich command has been defined)
    retrievePolicies(rootCommands, callbacks),
    // retrieve indices for join command
    callbacks?.getJoinIndices?.(),
  ]);

  const sourceFields = await getColumnsByTypeHelper(
    queryString.split('|')[0],
    callbacks
  ).getColumnMap();

  messages.push(
    ...validateUnsupportedTypeFields(
      sourceFields as Map<string, ESQLFieldWithMetadata>,
      rootCommands
    )
  );

  const license = await callbacks?.getLicense?.();
  const hasMinimumLicenseRequired = license?.hasAtLeast;

  /**
   * Even though we are validating single commands, we work with subqueries.
   *
   * The reason is that building the list of columns available in each command requires
   * the full command subsequence that precedes that command.
   */
  const subqueries = getSubqueriesToValidate(rootCommands);
  for (const subquery of subqueries) {
    const queryForFields = getQueryForFields(BasicPrettyPrinter.print(subquery), subquery);
    const { getColumnMap } = getColumnsByTypeHelper(queryForFields, callbacks);
    const availableColumns = await getColumnMap();

    const references: ReferenceMaps = {
      sources,
      columns: availableColumns,
      policies: availablePolicies,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
    };

    const commandMessages = validateCommand(
      subquery.commands[subquery.commands.length - 1],
      references,
      rootCommands,
      {
        ...callbacks,
        hasMinimumLicenseRequired,
      }
    );
    messages.push(...commandMessages);
  }

  const parserErrors = parsingResult.errors;

  /**
   * @TODO - move deeper
   *
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
  ast: ESQLAst,
  callbacks?: ICommandCallbacks
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

  // Check license requirements for the command
  if (callbacks?.hasMinimumLicenseRequired) {
    const license = commandDefinition.metadata.license;

    if (license && !callbacks.hasMinimumLicenseRequired(license.toLowerCase() as LicenseType)) {
      messages.push(
        getMessageFromId({
          messageId: 'licenseRequired',
          values: {
            name: command.name.toUpperCase(),
            requiredLicense: license.toUpperCase(),
          },
          locations: command.location,
        })
      );
    }
  }

  const context = {
    columns: references.columns,
    policies: references.policies,
    sources: [...references.sources].map((source) => ({
      name: source,
    })),
    joinSources: references.joinIndices,
  };

  if (commandDefinition.methods.validate) {
    messages.push(...commandDefinition.methods.validate(command, ast, context, callbacks));
  }

  // no need to check for mandatory options passed
  // as they are already validated at syntax level
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

/**
 * Returns a list of subqueries to validate
 * @param rootCommands
 *
 * TODO - extract to another module?
 */
function getSubqueriesToValidate(rootCommands: ESQLCommand[]) {
  const subsequences = [];
  const expandedCommands = expandEvals(rootCommands);
  for (let i = 0; i < expandedCommands.length; i++) {
    const command = expandedCommands[i];

    // every command within FORK's branches is its own subquery to be validated
    if (command.name.toLowerCase() === 'fork') {
      const branchSubqueries = getForkBranchSubqueries(command as ESQLCommand<'fork'>);
      for (const subquery of branchSubqueries) {
        subsequences.push([...expandedCommands.slice(0, i), ...subquery]);
      }
    }

    subsequences.push(expandedCommands.slice(0, i + 1));
  }

  return subsequences.map((subsequence) => Builder.expression.query(subsequence));
}

/**
 * Expands EVAL commands into separate commands for each expression.
 *
 * E.g. `EVAL 1 + 2, 3 + 4` becomes `EVAL 1 + 2 | EVAL 3 + 4`
 *
 * This is logically equivalent and makes validation and field existence detection much easier.
 *
 * @param commands The list of commands to expand.
 * @returns The expanded list of commands.
 */
function expandEvals(commands: ESQLCommand[]): ESQLCommand[] {
  const expanded: ESQLCommand[] = [];
  for (const command of commands) {
    if (command.name.toLowerCase() === 'eval') {
      // treat each expression within EVAL as a separate EVAL command
      for (const arg of command.args) {
        expanded.push(
          Builder.command({
            name: 'eval',
            args: [arg],
            location: command.location,
          })
        );
      }
    } else {
      expanded.push(command);
    }
  }
  return expanded;
}

/**
 * Expands a FORK command into queries for each command in each branch.
 *
 * E.g. FORK (EVAL 1 | LIMIT 10) (RENAME foo AS bar | DROP lolz)
 *
 * becomes [`EVAL 1`, `EVAL 1 | LIMIT 10`, `RENAME foo AS bar`, `RENAME foo AS bar | DROP lolz`]
 *
 * @param command a FORK command
 * @returns an array of expanded subqueries
 */
function getForkBranchSubqueries(command: ESQLCommand<'fork'>): ESQLCommand[][] {
  const expanded: ESQLCommand[][] = [];
  const branches = command.args as ESQLAstQueryExpression[];
  for (let j = 0; j < branches.length; j++) {
    for (let k = 0; k < branches[j].commands.length; k++) {
      const partialQuery = branches[j].commands.slice(0, k + 1);
      expanded.push(partialQuery);
    }
  }
  return expanded;
}
