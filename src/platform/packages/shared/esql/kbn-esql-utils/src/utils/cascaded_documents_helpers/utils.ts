/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import { type DataView, type DataViewField } from '@kbn/data-views-plugin/public';
import { Builder, isColumn, isFunctionExpression, mutate } from '@elastic/esql';
import type { EsqlQuery } from '@elastic/esql';
import type {
  ESQLAstExpression,
  ESQLFunction,
  ESQLCommand,
  ESQLLiteral,
} from '@elastic/esql/types';
import type { FieldSummary } from '@kbn/esql-language/src/commands/registry/types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getFieldDefinitionFromArg, getFieldTerminals, type Terminal } from '../esql_fields_utils';
import { getQuerySummaryPerCommandType, getSummaryPerCommand } from '../get_query_summary';
import { PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING } from '../append_to_query/utils';

// list of stats functions we support for grouping in the cascade experience
export const SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS = ['categorize' as const];

export type SupportedStatsFunction = (typeof SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS)[number];

export const isSupportedStatsFunction = (fnName: string): fnName is SupportedStatsFunction =>
  SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS.includes(fnName as SupportedStatsFunction);

export type SupportedFieldTypes = Exclude<
  keyof typeof Builder.expression.literal,
  'nil' | 'numeric' | 'timespan'
>;

export type FieldValue<T extends SupportedFieldTypes> =
  | Parameters<(typeof Builder.expression.literal)[T]>[0]
  | unknown;

export interface StatsCommandSummary {
  command: ESQLCommand;
  aggregates: Record<string, FieldSummary>;
  grouping: Record<string, FieldSummary>;
}

export const isCategorizeFunctionWithFunctionArgument = (functionDefinition: ESQLFunction) => {
  return (
    functionDefinition.name === 'categorize' &&
    functionDefinition.args.length === 1 &&
    isFunctionExpression(functionDefinition.args[0])
  );
};

// helper for removing backticks from field names of function names
export const removeBackticks = (str: string) => str.replace(/`/g, '');

/**
 * constrains the field value type to be one of the supported field value types, else we process as a string literal when building the expression
 */
export const isSupportedFieldType = (fieldType: unknown): fieldType is SupportedFieldTypes => {
  return (
    PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING.includes(fieldType as SupportedFieldTypes) &&
    Object.keys(Builder.expression.literal).includes(fieldType as SupportedFieldTypes)
  );
};

/**
 * if value is a text or keyword field and it's not "aggregatable", we opt to use match phrase for the where command
 */
export const requiresMatchPhrase = (fieldName: string, dataViewFields: DataView['fields']) => {
  let dataViewField = dataViewFields.getByName(fieldName);

  const multiSubtype = dataViewField && getDataViewFieldSubtypeMulti(dataViewField);

  if (multiSubtype) {
    // if the field is a subtype, we want to use the parent field to determine wether to use the match phrase
    dataViewField = dataViewFields.getByName(multiSubtype.multi.parent);
  }

  return (
    !dataViewField?.aggregatable &&
    (dataViewField?.esTypes?.includes('text') || dataViewField?.esTypes?.includes('keyword'))
  );
};

/**
 * Returns the stats command to operate on, we operate on the last stats command in the query
 */
export function getStatsCommandToOperateOn(esqlQuery: EsqlQuery) {
  if (esqlQuery.errors.length) {
    return null;
  }

  const statsCommands = Array.from(mutate.commands.stats.list(esqlQuery.ast));

  if (statsCommands.length === 0) {
    return null;
  }

  // accounting for the possibility of multiple stats commands in the query,
  // we always want to operate on the last stats command
  const lastStatsCommandIndex = statsCommands.length - 1;

  const summarizedStatsCommand = getStatsCommandAtIndexSummary(esqlQuery, lastStatsCommandIndex);
  if (!summarizedStatsCommand) {
    return null;
  }

  return Object.assign(summarizedStatsCommand, { index: lastStatsCommandIndex });
}

/**
 * Returns the data source command from the esql query, supports both the FROM and TS commands
 */
export function getESQLQueryDataSourceCommand(
  esqlQuery: EsqlQuery
): ESQLCommand<'from' | 'ts'> | undefined {
  return mutate.generic.commands.find(
    esqlQuery.ast,
    (cmd) => cmd.name === 'from' || cmd.name === 'ts'
  ) as ESQLCommand<'from' | 'ts'> | undefined;
}

/**
 * Returns runtime fields that are created within the query by the STATS command in the query
 */
export function getStatsCommandRuntimeFields(esqlQuery: EsqlQuery) {
  const querySummary = getQuerySummaryPerCommandType(esqlQuery.print(), 'stats');
  return querySummary.map((command) => command.newColumns);
}

/**
 * Returns the summary of the stats command at the given command index in the esql query
 */
export function getStatsCommandAtIndexSummary(esqlQuery: EsqlQuery, commandIndex: number) {
  const declarationCommand = mutate.commands.stats.byIndex(esqlQuery.ast, commandIndex);

  if (!declarationCommand) {
    return null;
  }

  const summarizedStatsCommand = getSummaryPerCommand(esqlQuery.src, declarationCommand);

  // Transform to map format for easy access
  const groupingsMap = Array.from(summarizedStatsCommand.grouping ?? []).reduce((acc, grouping) => {
    acc[grouping.field] = grouping;
    return acc;
  }, {} as Record<string, FieldSummary>);

  const aggregatesMap = Array.from(summarizedStatsCommand.aggregates ?? []).reduce(
    (acc, aggregate) => {
      acc[aggregate.field] = aggregate;
      return acc;
    },
    {} as Record<string, FieldSummary>
  );

  return {
    command: declarationCommand,
    grouping: groupingsMap,
    aggregates: aggregatesMap,
  };
}

/**
 * Returns the param definition for the given field name
 */
export function getFieldParamDefinition(
  fieldName: string,
  fieldTerminals: Array<Terminal>,
  esqlVariables: ESQLControlVariable[] | undefined
) {
  const fieldParamDef = fieldTerminals.find(
    (arg) => arg.text === fieldName && arg.type === 'literal' && arg.literalType === 'param'
  ) as ESQLLiteral | undefined;

  if (fieldParamDef) {
    const controlVariable = esqlVariables?.find((variable) => variable.key === fieldParamDef.value);

    if (!controlVariable) {
      throw new Error(`The control variable for the "${fieldName}" column was not found`);
    }

    return controlVariable.value;
  }
}

export function getStatsGroupFieldType<
  T extends FieldSummary | undefined,
  R = T extends FieldSummary ? string : undefined
>(groupByFields: T): R {
  if (!groupByFields) {
    return undefined as R;
  }
  const definition = getFieldDefinitionFromArg(groupByFields.arg);
  return (definition.type === 'function' ? definition.name : definition.type) as R;
}

/**
 * Values displayed for the aggregates of the cascade row that's being operated on,
 * keyed by the aggregate identifier as it is displayed in the UI.
 */
export type NodeAggregatedValues = Record<string, number | Array<string | number> | undefined>;

const VALUES_FUNCTION_NAME = 'values';

/**
 * Kibana field types for which an exact phrase match is the appropriate document level predicate
 */
const MATCH_PHRASE_FIELD_TYPES = ['string'];

/**
 * Remaining Kibana field types that VALUES supports and that the MATCH function can target,
 * spatial types are intentionally absent because no full text predicate exists for them.
 * {@link https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/aggregation-functions#esql-values | here}
 */
const MATCH_FIELD_TYPES = ['boolean', 'date', 'date_nanos', 'ip', 'number', 'version'];

/**
 * Returns the full text function that can be used to filter documents on the provided field,
 * or undefined when no document level predicate can be expressed for the field.
 */
const getAggregateValueMatchFunction = (
  fieldName: string,
  dataViewFields: DataView['fields']
): 'match_phrase' | 'match' | undefined => {
  let dataViewField: DataViewField | undefined = dataViewFields.getByName(fieldName);

  const multiSubtype = dataViewField && getDataViewFieldSubtypeMulti(dataViewField);

  if (multiSubtype) {
    // the parent field holds the type information we care about for multi fields
    dataViewField = dataViewFields.getByName(multiSubtype.multi.parent) ?? dataViewField;
  }

  // full text functions require the field to be searchable,
  // so when we can't resolve the field or it isn't searchable we don't attempt to filter on it
  if (!dataViewField || dataViewField.searchable === false) {
    return undefined;
  }

  if (MATCH_PHRASE_FIELD_TYPES.includes(dataViewField.type)) {
    return 'match_phrase';
  }

  if (MATCH_FIELD_TYPES.includes(dataViewField.type)) {
    return 'match';
  }

  return undefined;
};

const buildAggregateValueLiteral = (value: string | number) => {
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? Builder.expression.literal.integer(value)
      : Builder.expression.literal.decimal(value);
  }

  return Builder.expression.literal.string(value);
};

export interface ValuesAggregateFilterArgs {
  /**
   * summary of the stats command that declares the aggregates displayed for the cascade row
   */
  statsSummary: StatsCommandSummary;
  /**
   * values displayed for the aggregates of the cascade row that's being operated on
   */
  nodeAggregatedValues: NodeAggregatedValues | undefined;
  dataViewFields: DataView['fields'];
  esqlVariables: ESQLControlVariable[] | undefined;
}

/**
 * Builds the document level predicates that constrain the documents fetched for a cascade row
 * to those that contributed the VALUES aggregates displayed for said row.
 *
 * This is only relevant for cascade queries that omit the STATS command, because such queries
 * would otherwise return every document of the group, including documents holding values
 * that the row the user expanded never displayed.
 *
 * Full text functions are used rather than comparison operators on purpose, VALUES columns are
 * frequently multivalued and ES|QL comparison operators evaluate to null for multivalued fields,
 * which would drop the very documents we are trying to surface.
 */
export const buildValuesAggregateFilterExpressions = ({
  statsSummary,
  nodeAggregatedValues,
  dataViewFields,
  esqlVariables,
}: ValuesAggregateFilterArgs): ESQLAstExpression[] => {
  if (!nodeAggregatedValues || !Object.keys(nodeAggregatedValues).length) {
    return [];
  }

  return Object.values(statsSummary.aggregates).reduce<ESQLAstExpression[]>(
    (filters, aggregate) => {
      const aggregateDefinition = getFieldDefinitionFromArg(aggregate.arg);

      if (
        !isFunctionExpression(aggregateDefinition) ||
        aggregateDefinition.name !== VALUES_FUNCTION_NAME
      ) {
        // aggregates like COUNT or AVG have no per document equivalent we could filter on
        return filters;
      }

      const [valuesArgument] = aggregateDefinition.args;

      if (!isColumn(valuesArgument)) {
        // we only support VALUES applied to a column,
        // filtering on the result of an expression would require evaluating the expression per document
        return filters;
      }

      let aggregatedColumnName = valuesArgument.name;

      const aggregatedColumnNameParamValue = getFieldParamDefinition(
        aggregatedColumnName,
        getFieldTerminals(aggregate.arg),
        esqlVariables
      );

      if (typeof aggregatedColumnNameParamValue === 'string') {
        aggregatedColumnName = aggregatedColumnNameParamValue;
      }

      aggregatedColumnName = removeBackticks(aggregatedColumnName);

      const displayedValues = nodeAggregatedValues[removeBackticks(aggregate.field)];

      const aggregateValues = (Array.isArray(displayedValues) ? displayedValues : [displayedValues])
        .filter((value): value is string | number => value !== undefined && value !== null)
        .filter((value) => value !== '');

      if (!aggregateValues.length) {
        return filters;
      }

      const matchFunction = getAggregateValueMatchFunction(aggregatedColumnName, dataViewFields);

      if (!matchFunction) {
        return filters;
      }

      const valueExpressions = aggregateValues.map((value) =>
        Builder.expression.func.call(matchFunction, [
          Builder.identifier({ name: aggregatedColumnName }),
          buildAggregateValueLiteral(value),
        ])
      );

      filters.push(
        // the row displays every value the aggregate holds, a document only needs to match one of them
        valueExpressions.reduce((left, right) =>
          Builder.expression.func.binary('or', [left, right])
        )
      );

      return filters;
    },
    []
  );
};

/**
 * Combines the provided expressions into a single AND expression.
 *
 * The AST Builder is used instead of a synth template because the latter prints each expression
 * on its own before glueing the result back together, which loses the grouping nested operands carried.
 */
export const combineFilterExpressionsWithAnd = (expressions: ESQLAstExpression[]) =>
  expressions.reduce((left, right) => Builder.expression.func.binary('and', [left, right]));

/**
 * Returns true when the query being operated on sources its data from a TS (timeseries) command.
 */
export const isTimeseriesSourceQuery = (esqlQuery: EsqlQuery) =>
  getESQLQueryDataSourceCommand(esqlQuery)?.name === 'ts';
