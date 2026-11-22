/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLCommand } from '@elastic/esql/types';
import { EsqlQuery, isList, isSource, Walker, within } from '@elastic/esql';
import type { ESQLAstAllCommands } from '@elastic/esql/types';
import { esqlCommandRegistry } from '../../commands/registry';
import type { ICommandCallbacks } from '../../commands/registry/types';
import { UnmappedFieldsStrategy } from '../../commands/registry/types';
import { errors, getExpressionType, getMessageFromId } from '../../commands/definitions/utils';
import { areCompatibleStringTypes } from '../../commands/definitions/utils/signatures';
import { QueryColumns } from '../../query_columns_service';
import { retrievePolicies, retrieveSources } from './resources';
import type { ReferenceMaps, ValidationOptions, ValidationResult } from './types';
import { getInSubqueries, getSubqueriesToValidate, type InSubqueryReference } from './subqueries';
import {
  findNamedSubqueryForSource,
  getNamedSubqueries,
  getNamedSubqueriesAvailableTo,
  type NamedSubquery,
} from '../../commands/definitions/utils/named_subqueries';
import { getUnmappedFieldsStrategy } from '../../commands/definitions/utils/settings';
import { isTimeseriesSourceCommand } from '../../commands/definitions/utils/timeseries_check';
import { areNewUnmappedFieldsAllowed } from '../../query_columns_service/helpers';
import type { ESQLMessage } from '../../commands';

const UNRESOLVED_TYPES = new Set(['unknown', 'unsupported', 'param']);

/**
 * ES|QL validation public API
 * It takes a query string and returns a list of messages (errors and warnings) after validate
 * The astProvider is optional, but if not provided the default one will be used.
 * This is useful for async loading the ES|QL parser and reduce the bundle size, or to swap grammar version.
 * As for the callbacks, while optional, the validation function will selectively ignore some errors types based on each callback missing.
 *
 * @param queryString - The query string to validate
 * @param callbacks - Optional callbacks for resource retrieval.
 * @param options.invalidateColumnsCache - Invalidates the columns metadata cache before validation. Has no effect if 'getColumnsFor' callback is not provided.
 *
 */
export async function validateQuery(
  queryString: string,
  callbacks?: ESQLCallbacks,
  options?: ValidationOptions
): Promise<ValidationResult> {
  return validateAst(queryString, callbacks, options);
}

function shouldValidateCallback<K extends keyof ESQLCallbacks>(
  callbacks: ESQLCallbacks | undefined,
  name: K
): boolean {
  return callbacks?.[name] !== undefined;
}

/**
 * Returns the LETs the main query reads with FROM, directly or through other LETs,
 * in declaration order.
 */
const getUsedNamedSubqueries = (
  rootCommands: ESQLCommand[],
  namedSubqueries: NamedSubquery[]
): NamedSubquery[] => {
  if (namedSubqueries.length === 0) {
    return [];
  }

  const used = new Set<NamedSubquery>();
  const pending: Array<{ commands: ESQLCommand[]; available: readonly NamedSubquery[] }> = [
    { commands: rootCommands, available: namedSubqueries },
  ];

  for (let next = pending.pop(); next; next = pending.pop()) {
    const { commands, available } = next;
    const fromCommands = Walker.matchAll(commands, {
      type: 'command',
      name: 'from',
    }) as ESQLCommand[];

    for (const source of fromCommands.flatMap(({ args }) => args.filter(isSource))) {
      const namedSubquery = findNamedSubqueryForSource(source, available);

      if (namedSubquery && !used.has(namedSubquery)) {
        used.add(namedSubquery);
        // A LET body can only read the LETs declared before it.
        pending.push({
          commands: namedSubquery.query.commands,
          available: getNamedSubqueriesAvailableTo(namedSubqueries, namedSubquery),
        });
      }
    }
  }

  return namedSubqueries.filter((namedSubquery) => used.has(namedSubquery));
};

/**
 * This function will perform an high level validation of the
 * query AST. An initial syntax validation is already performed by the parser
 * while here it can detect things like function names, types correctness and potential warnings
 * @param ast A valid AST data structure
 */
async function validateAst(
  queryString: string,
  callbacks?: ESQLCallbacks,
  options?: ValidationOptions
): Promise<ValidationResult> {
  const messages: ESQLMessage[] = [];

  const parsingResult = EsqlQuery.fromSrc(queryString);
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

  const headerCommands = parsingResult.ast.header ?? [];

  const rootCommands = parsingResult.ast.commands;

  // The LET bindings of the header; empty when the query has none.
  const namedSubqueries = getNamedSubqueries(headerCommands);

  const usedNamedSubqueries = getUsedNamedSubqueries(rootCommands, namedSubqueries);

  // The main query and the body of every LET it reads, which Elasticsearch analyzes like the main
  // query. A LET body sees the SET commands and the LETs declared before it.
  const pipelines = [
    { commands: rootCommands, header: headerCommands },
    ...usedNamedSubqueries.map(({ command, query }) => ({
      commands: query.commands,
      header: headerCommands.slice(0, headerCommands.indexOf(command)),
    })),
  ];

  // Look up indices and policies in every pipeline: in `LET a = (FROM logs); ROW x = 1 | WHERE x IN
  // (FROM a)` only the body of `a` reads an index.
  const [sources, availablePolicies, joinIndices, timeSeriesSources, views, datasets, license] =
    await Promise.all([
      shouldValidateCallback(callbacks, 'getSources')
        ? retrieveSources(
            pipelines.flatMap(({ commands }) => commands),
            callbacks
          )
        : new Set<string>(),
      shouldValidateCallback(callbacks, 'getPolicies')
        ? retrievePolicies(
            pipelines.flatMap(({ commands }) => commands),
            callbacks
          )
        : new Map(),
      shouldValidateCallback(callbacks, 'getJoinIndices')
        ? callbacks?.getJoinIndices?.()
        : undefined,
      shouldValidateCallback(callbacks, 'getTimeseriesIndices')
        ? callbacks?.getTimeseriesIndices?.()
        : undefined,
      shouldValidateCallback(callbacks, 'getViews') ? callbacks?.getViews?.() : undefined,
      shouldValidateCallback(callbacks, 'getDatasets') ? callbacks?.getDatasets?.() : undefined,
      callbacks?.getLicense?.(),
    ]);
  const hasMinimumLicenseRequired = license
    ? (minimumLicenseRequired: LicenseType) => license.hasAtLeast(minimumLicenseRequired)
    : undefined;

  // An IN subquery can read the LET bindings of the header.
  const letCommands = namedSubqueries.map(({ command }) => command);

  const isRootTimeseries = isTimeseriesSourceCommand(rootCommands);

  // Validate the header commands
  for (const command of headerCommands) {
    const references: ReferenceMaps = {
      sources,
      namedSubqueries,
      columns: new Map(), // no columns available in header
      policies: availablePolicies,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
      timeSeriesSources: timeSeriesSources?.indices,
      views: views?.views ?? [],
      datasets: datasets?.datasets ?? [],
    };

    const commandMessages = validateCommand(command, references, rootCommands, isRootTimeseries, {
      ...callbacks,
      hasMinimumLicenseRequired,
    });
    messages.push(...commandMessages);
  }

  const unmappedFieldsStrategyFromHeader = getUnmappedFieldsStrategy(headerCommands);

  /**
   * Even though we are validating single commands, we work with subqueries.
   *
   * The reason is that building the list of columns available in each command requires
   * the full command subsequence that precedes that command.
   */
  // Each subquery keeps the commands of its pipeline, which its command is validated against.
  const subqueries = pipelines.flatMap(({ commands, header }) =>
    getSubqueriesToValidate(commands, header).map((subquery) => ({
      subquery,
      pipelineCommands: commands,
    }))
  );

  for (const { subquery, pipelineCommands } of subqueries) {
    const currentCommand = subquery.commands[subquery.commands.length - 1];

    const subqueryForColumns =
      currentCommand.name === 'join' || currentCommand.name === 'promql'
        ? subquery
        : { ...subquery, commands: subquery.commands.slice(0, -1) };

    const queryForColumns =
      currentCommand.name === 'promql'
        ? queryString.slice(0, currentCommand.location.max + 1)
        : queryString;

    const columns = shouldValidateCallback(callbacks, 'getColumnsFor')
      ? await new QueryColumns(subqueryForColumns, queryForColumns, callbacks, options).asMap()
      : new Map();

    const references: ReferenceMaps = {
      sources,
      namedSubqueries,
      columns,
      policies: availablePolicies,
      query: queryString,
      joinIndices: joinIndices?.indices || [],
      timeSeriesSources: timeSeriesSources?.indices,
      views: views?.views ?? [],
      datasets: datasets?.datasets ?? [],
    };

    const unmappedFieldsStrategy = areNewUnmappedFieldsAllowed(subqueryForColumns.commands)
      ? unmappedFieldsStrategyFromHeader
      : UnmappedFieldsStrategy.DEFAULT;

    // FORK and FUSE check the pipeline that contains them, which can be an IN or FROM subquery.
    const commandMessages = validateCommand(
      currentCommand,
      references,
      ['fork', 'fuse'].includes(currentCommand.name) ? subquery.commands : pipelineCommands,
      isTimeseriesSourceCommand(subquery.commands),
      {
        ...callbacks,
        hasMinimumLicenseRequired,
      },
      unmappedFieldsStrategy
    );
    messages.push(...commandMessages);

    // In `WHERE a IN (FROM index | KEEP b)`, the type of `a` must match the type of `b`.
    // Comparing them requires the columns the subquery returns, so drop the subqueries
    // that failed validation above: whatever columns they report would be misleading.
    const inSubqueries = getInSubqueries(currentCommand).filter(
      ({ query }) => !messages.some((message) => message.type === 'error' && within(message, query))
    );

    if (
      !currentCommand.incomplete &&
      inSubqueries.length > 0 &&
      shouldValidateCallback(callbacks, 'getColumnsFor')
    ) {
      // We need the columns the subquery returns, which nothing has computed yet.
      // Cheap anyway: its source columns were already cached earlier in this loop.
      const rightColumns = await Promise.all(
        inSubqueries.map(({ query }) =>
          new QueryColumns(
            { ...query, header: letCommands },
            queryString,
            callbacks,
            options
          ).asMap()
        )
      );
      messages.push(
        ...validateInSubqueries(inSubqueries, columns, rightColumns, unmappedFieldsStrategy)
      );
    }
  }

  return {
    errors: [...parserErrors, ...messages.filter(({ type }) => type === 'error')],
    warnings: messages.filter(({ type }) => type === 'warning'),
  };
}

function validateInSubqueries(
  inSubqueries: InSubqueryReference[],
  columns: ReferenceMaps['columns'],
  rightColumns: Array<ReferenceMaps['columns']>,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): ESQLMessage[] {
  const messages: ESQLMessage[] = [];

  for (let i = 0; i < inSubqueries.length; i++) {
    const { left } = inSubqueries[i];
    const leftExpressions = isList(left) && left.subtype === 'tuple' ? left.values : [left];
    const rightExpressions = [...rightColumns[i].values()];

    if (rightExpressions.length === 0) {
      continue;
    }

    if (leftExpressions.length !== rightExpressions.length) {
      messages.push(
        errors.byId('inSubqueryColumnCountMismatch', left.location, {
          expected: leftExpressions.length,
          actual: rightExpressions.length,
        })
      );
      continue;
    }

    for (let j = 0; j < leftExpressions.length; j++) {
      const leftExpression = leftExpressions[j];
      const rightExpression = rightExpressions[j];
      const leftType = getExpressionType(leftExpression, columns, unmappedFieldsStrategy);
      const rightType = rightExpression.type;

      if (
        UNRESOLVED_TYPES.has(leftType) ||
        UNRESOLVED_TYPES.has(rightType) ||
        leftType === rightType ||
        areCompatibleStringTypes(leftType, rightType)
      ) {
        continue;
      }

      messages.push(
        errors.byId('inSubqueryTypeMismatch', leftExpression.location, {
          leftField: leftExpression.text,
          leftType,
          rightField: rightExpression.name,
          rightType,
        })
      );
    }
  }

  return messages;
}

function validateCommand(
  command: ESQLAstAllCommands,
  references: ReferenceMaps,
  rootCommands: ESQLCommand[],
  isTimeseriesSource: boolean,
  callbacks?: ICommandCallbacks,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
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
    sources: [...references.sources].map((source) => ({ name: source, hidden: false })),
    namedSubqueries: references.namedSubqueries,
    joinSources: references.joinIndices,
    timeSeriesSources: references.timeSeriesSources,
    views: references.views,
    datasets: references.datasets,
    unmappedFieldsStrategy,
    isTimeseriesSource,
  };

  if (commandDefinition.methods.validate) {
    const allErrors = commandDefinition.methods.validate(
      command,
      rootCommands,
      context,
      callbacks,
      references.query
    );

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
