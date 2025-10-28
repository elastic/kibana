/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand, ESQLMessage } from '@kbn/esql-ast';
import { EsqlQuery, esqlCommandRegistry, walk } from '@kbn/esql-ast';
import type {
  ESQLFieldWithMetadata,
  ICommandCallbacks,
} from '@kbn/esql-ast/src/commands_registry/types';
import { getMessageFromId } from '@kbn/esql-ast/src/definitions/utils';
import type { LicenseType } from '@kbn/licensing-types';

import type { ESQLAstAllCommands } from '@kbn/esql-ast/src/types';
import { QueryColumns } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import { retrievePolicies, retrieveSources } from './resources';
import type { ReferenceMaps, ValidationResult } from './types';
import { getSubqueriesToValidate } from './helpers';

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one from '@kbn/esql-validation-autocomplete' will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 */
export async function validateQuery(
  queryString: string,
  callbacks?: ESQLCallbacks
): Promise<ValidationResult> {
  return validateAst(queryString, callbacks);
}

function shouldValidateCallback<K extends keyof ESQLCallbacks>(
  callbacks: ESQLCallbacks | undefined,
  name: K
): boolean {
  return callbacks?.[name] !== undefined;
}

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

  const headerCommands = parsingResult.ast.header ?? [];

  const rootCommands = parsingResult.ast.commands;

  const [sources, availablePolicies, joinIndices] = await Promise.all([
    shouldValidateCallback(callbacks, 'getSources')
      ? retrieveSources(rootCommands, callbacks)
      : new Set<string>(),
    shouldValidateCallback(callbacks, 'getPolicies')
      ? retrievePolicies(rootCommands, callbacks)
      : new Map(),
    shouldValidateCallback(callbacks, 'getJoinIndices') ? callbacks?.getJoinIndices?.() : undefined,
  ]);

  const sourceQuery = queryString.split('|')[0];
  const sourceFields = shouldValidateCallback(callbacks, 'getColumnsFor')
    ? await new QueryColumns(EsqlQuery.fromSrc(sourceQuery).ast, sourceQuery, callbacks).asMap()
    : new Map();

  if (shouldValidateCallback(callbacks, 'getColumnsFor') && sourceFields.size > 0) {
    messages.push(
      ...validateUnsupportedTypeFields(
        sourceFields as Map<string, ESQLFieldWithMetadata>,
        rootCommands
      )
    );
  }

  const license = await callbacks?.getLicense?.();
  const hasMinimumLicenseRequired = license?.hasAtLeast;

  // Validate the header commands
  for (const command of headerCommands) {
    const references: ReferenceMaps = {
      sources,
      columns: new Map(), // no columns available in header
      policies: availablePolicies,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
    };

    const commandMessages = validateCommand(command, references, rootCommands, {
      ...callbacks,
      hasMinimumLicenseRequired,
    });
    messages.push(...commandMessages);
  }

  /**
   * Even though we are validating single commands, we work with subqueries.
   *
   * The reason is that building the list of columns available in each command requires
   * the full command subsequence that precedes that command.
   */
  const subqueries = getSubqueriesToValidate(rootCommands);
  for (const subquery of subqueries) {
    const currentCommand = subquery.commands[subquery.commands.length - 1];

    const subqueryForColumns =
      currentCommand.name === 'join'
        ? subquery
        : { ...subquery, commands: subquery.commands.slice(0, -1) };

    const columns = shouldValidateCallback(callbacks, 'getColumnsFor')
      ? await new QueryColumns(subqueryForColumns, queryString, callbacks).asMap()
      : new Map();

    const references: ReferenceMaps = {
      sources,
      columns,
      policies: availablePolicies,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
    };

    const commandMessages = validateCommand(currentCommand, references, rootCommands, {
      ...callbacks,
      hasMinimumLicenseRequired,
    });
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
  command: ESQLAstAllCommands,
  references: ReferenceMaps,
  rootCommands: ESQLCommand[],
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
    sources: [...references.sources].map((source) => ({ name: source })),
    joinSources: references.joinIndices,
  };

  if (commandDefinition.methods.validate) {
    const allErrors = commandDefinition.methods.validate(command, rootCommands, context, callbacks);

    const filteredErrors = allErrors.filter((error) => {
      if (error.errorType === 'semantic' && error.requiresCallback) {
        return shouldValidateCallback(callbacks, error.requiresCallback as keyof ESQLCallbacks);
      }

      // All other errors pass through (syntax errors, untagged errors, etc.)
      return true;
    });

    messages.push(...filteredErrors);
  }

  // no need to check for mandatory options passed
  // as they are already validated at syntax level
  return messages;
}

function validateUnsupportedTypeFields(
  fields: Map<string, ESQLFieldWithMetadata>,
  commands: ESQLAstAllCommands[]
) {
  const usedColumnsInQuery: string[] = [];

  walk(commands, {
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
