/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery } from '@kbn/es-query';
import {
  BasicPrettyPrinter,
  Builder,
  EsqlQuery,
  isColumn,
  isOptionNode,
  isFunctionExpression,
  mutate,
  synth,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLAstItem,
  type ESQLCommandOption,
  type ESQLColumn,
  isBinaryExpression,
} from '@kbn/esql-ast';
import type {
  StatsCommandSummary,
  StatsFieldSummary,
} from '@kbn/esql-ast/src/mutate/commands/stats';
import type {
  BinaryExpressionComparisonOperator,
  BinaryExpressionWhereOperator,
  ESQLBinaryExpression,
} from '@kbn/esql-ast/src/types';
import { extractCategorizeTokens } from './extract_categorize_tokens';
import { getOperator, PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING } from './append_to_query';

type NodeType = 'group' | 'leaf';

type StatsCommand = ESQLCommand<'stats'>;

export interface AppliedStatsFunction {
  identifier: string;
  aggregation: string;
}

export interface ESQLStatsQueryMeta {
  groupByFields: Array<{ field: string; type: string }>;
  appliedFunctions: AppliedStatsFunction[];
}

// list of stats functions we support for grouping in the cascade experience
const SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS = ['categorize' as const];

export type SupportedStatsFunction = (typeof SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS)[number];

const isSupportedStatsFunction = (fnName: string): fnName is SupportedStatsFunction =>
  SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS.includes(fnName as SupportedStatsFunction);

export type SupportedFieldTypes = Exclude<
  keyof typeof Builder.expression.literal,
  'nil' | 'numeric' | 'timespan'
>;

export type FieldValue<T extends SupportedFieldTypes> =
  | Parameters<(typeof Builder.expression.literal)[T]>[0]
  | unknown;

// helper for removing backticks from field names of function names
const removeBackticks = (str: string) => str.replace(/`/g, '');

/**
 * constrains the field value type to be one of the supported field value types, else we process as a string literal when building the expression
 */
export const isSupportedFieldType = (fieldType: unknown): fieldType is SupportedFieldTypes => {
  return (
    PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING.includes(fieldType as SupportedFieldTypes) &&
    Object.keys(Builder.expression.literal).includes(fieldType as SupportedFieldTypes)
  );
};

function getStatsCommandToOperateOn(esqlQuery: EsqlQuery): StatsCommandSummary | null {
  if (esqlQuery.errors.length) {
    return null;
  }

  const statsCommands = Array.from(mutate.commands.stats.list(esqlQuery.ast));

  if (statsCommands.length === 0) {
    return null;
  }

  let summarizedStatsCommand: StatsCommandSummary | null = null;

  // accounting for the possibility of multiple stats commands in the query,
  // we always want to operate on the last stats command that has valid grouping options
  for (let i = statsCommands.length - 1; i >= 0; i--) {
    summarizedStatsCommand = mutate.commands.stats.summarizeCommand(esqlQuery, statsCommands[i]);

    if (summarizedStatsCommand.grouping && Object.keys(summarizedStatsCommand.grouping).length) {
      break;
    }
  }

  return summarizedStatsCommand;
}

function getESQLQueryDataSourceCommand(
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
function getStatsCommandRuntimeFields(esqlQuery: EsqlQuery) {
  return Array.from(mutate.commands.stats.summarize(esqlQuery)).map((command) => command.newFields);
}

/**
 * Returns a set of all the runtime fields in the query, created by the EVAL command
 */
function getEvalCommandRuntimeFields(esqlQuery: EsqlQuery) {
  return esqlQuery.ast.commands.reduce((acc, cur) => {
    if (cur.name !== 'eval') {
      return acc;
    }

    cur.args.forEach((arg) => {
      // runtime fields are created in the EVAL as arguments that are function assignments
      if (isFunctionExpression(arg) && isColumn(arg.args[0])) {
        acc.push(((arg as ESQLFunction).args[0] as ESQLColumn).name);
      }
    });

    return acc;
  }, [] as string[]);
}

/**
 * Returns the summary of the stats command at the given command index in the esql query
 */
function getStatsCommandAtIndexSummary(esqlQuery: EsqlQuery, commandIndex: number) {
  const declarationCommand = mutate.commands.stats.byIndex(esqlQuery.ast, commandIndex);

  if (!declarationCommand) {
    return null;
  }

  return mutate.commands.stats.summarizeCommand(esqlQuery, declarationCommand);
}

export const getESQLStatsQueryMeta = (queryString: string): ESQLStatsQueryMeta => {
  const groupByFields: ESQLStatsQueryMeta['groupByFields'] = [];
  const appliedFunctions: ESQLStatsQueryMeta['appliedFunctions'] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  const summarizedStatsCommand = getStatsCommandToOperateOn(esqlQuery);

  if (!summarizedStatsCommand) {
    return { groupByFields, appliedFunctions };
  }

  // get all the new fields created by the stats commands in the query,
  // so we might tell if the command we are operating on is referencing a field that was defined by a preceding command
  const statsCommandRuntimeFields = getStatsCommandRuntimeFields(esqlQuery);

  const grouping = Object.values(summarizedStatsCommand.grouping);

  for (let j = 0; j < grouping.length; j++) {
    const group = grouping[j];

    if (!group.definition) {
      // query received is malformed without complete grouping definition, there's no need to proceed further
      return { groupByFields: [], appliedFunctions: [] };
    }

    const groupFieldName = removeBackticks(group.field);
    let groupFieldNode = group;

    const groupDeclarationCommandIndex = statsCommandRuntimeFields.findIndex((field) =>
      field.has(groupFieldName)
    );

    let groupDeclarationCommandSummary: StatsCommandSummary | null = null;

    if (
      groupDeclarationCommandIndex !== -1 &&
      (groupDeclarationCommandSummary = getStatsCommandAtIndexSummary(
        esqlQuery,
        groupDeclarationCommandIndex
      ))
    ) {
      // update the group field node to it's actual definition
      groupFieldNode = groupDeclarationCommandSummary.grouping[groupFieldName];
    }

    // check if there is a where command targeting the group field in the stats command
    const whereCommandGroupFieldSearch = mutate.commands.where.byField(
      esqlQuery.ast,
      Builder.expression.column({
        args: [Builder.identifier({ name: groupFieldName })],
      })
    );

    if (whereCommandGroupFieldSearch?.length) {
      if (groupByFields.length > 0) {
        // if there's a where command targeting the group in this current iteration,
        // then this specific query can only be grouped by the current group, pivoting on any other columns though they exist
        // in the query would be invalid, hence we clear out any previously added group by fields since they are no longer valid
        groupByFields.splice(0, groupByFields.length);
      }

      // add the current group and break out of the loop
      // since there's no need to continue processing other groups
      // as they are not valid in this context
      groupByFields.push({
        field: groupFieldName,
        type:
          groupFieldNode.definition.type === 'function'
            ? groupFieldNode.definition.name
            : groupFieldNode.definition.type,
      });

      break;
    }

    if (isFunctionExpression(groupFieldNode.definition)) {
      const functionName = groupFieldNode.definition.name;
      if (!isSupportedStatsFunction(functionName)) {
        continue;
      }
    }

    groupByFields.push({
      field: groupFieldName,
      type:
        groupFieldNode.definition.type === 'function'
          ? groupFieldNode.definition.name
          : groupFieldNode.definition.type,
    });
  }

  Object.values(summarizedStatsCommand.aggregates).forEach((aggregate) => {
    appliedFunctions.push({
      identifier: removeBackticks(aggregate.field), // we remove backticks to have a clean identifier that gets displayed in the UI
      aggregation:
        (aggregate.definition as ESQLFunction).operator?.name ?? aggregate.definition.text,
    });
  });

  return { groupByFields, appliedFunctions };
};

export interface CascadeQueryArgs {
  /**
   * anchor query for generating the next valid query
   */
  query: AggregateQuery;
  /**
   * Node type (group or leaf) for which we are constructing the cascade query
   */
  nodeType: NodeType;
  /**
   * Node path for the current node in the cascade experience we'd like to generate a query for
   */
  nodePath: string[];
  /**
   * Mapping of node paths to their corresponding values, used to populate the query with literal values
   */
  nodePathMap: Record<string, string>;
}

/**
 * Constructs a cascade query from the provided query, based on the node type, node path and node path map.
 */
export const constructCascadeQuery = ({
  query,
  nodeType,
  nodePath,
  nodePathMap,
}: CascadeQueryArgs): AggregateQuery | undefined => {
  const EditorESQLQuery = EsqlQuery.fromSrc(query.esql);

  if (EditorESQLQuery.errors.length) {
    throw new Error('Query is malformed');
  }

  const summarizedStatsCommand = getStatsCommandToOperateOn(EditorESQLQuery);

  if (!summarizedStatsCommand) {
    throw new Error('Query does not have a valid stats command with grouping options');
  }

  const statsCommandRuntimeFields = getStatsCommandRuntimeFields(EditorESQLQuery);
  const evalCommandRuntimeFields = getEvalCommandRuntimeFields(EditorESQLQuery);

  if (nodeType === 'leaf') {
    const pathSegment = nodePath[nodePath.length - 1];

    const groupDeclarationCommandIndex = statsCommandRuntimeFields.findIndex((field) =>
      field.has(pathSegment)
    );

    const groupIsStatsDeclaredRuntimeField = groupDeclarationCommandIndex >= 0;

    let groupDeclarationCommandSummary: StatsCommandSummary | null = null;

    if (groupIsStatsDeclaredRuntimeField) {
      groupDeclarationCommandSummary = getStatsCommandAtIndexSummary(
        EditorESQLQuery,
        groupDeclarationCommandIndex
      );
    }

    const groupValue =
      (groupDeclarationCommandSummary ?? summarizedStatsCommand).grouping[pathSegment] ??
      // when a column name is not assigned, one is created automatically that includes backticks
      (groupDeclarationCommandSummary ?? summarizedStatsCommand).grouping[`\`${pathSegment}\``];

    // check if we have a value for the path segment in the node path map to match on
    if (!(groupValue && nodePathMap[pathSegment] !== undefined)) {
      throw new Error(`The "${pathSegment}" field is not operable`);
    }

    const operatingStatsCommandIndex = EditorESQLQuery.ast.commands.findIndex(
      (cmd) => cmd.text === summarizedStatsCommand.command.text
    );

    // create a new query to populate with the cascade operation query
    const cascadeOperationQuery = EsqlQuery.fromSrc('');

    // include all the existing commands up to the operating stats command in the cascade operation query
    EditorESQLQuery.ast.commands.slice(0, operatingStatsCommandIndex).forEach((cmd, idx, arr) => {
      if (idx === arr.length - 1 && cmd.name === 'stats') {
        // however, when the last command is a stats command, we don't want to include it in the cascade operation query
        // since where commands that use either the MATCH or MATCH_PHRASE function cannot be immediately followed by a stats command
        // and moreover this STATS command doesn't provide any useful context even if it defines new runtime fields
        // we would not be leveraging them for the cascade operation
        return;
      }

      mutate.generic.commands.append(cascadeOperationQuery.ast, cmd);
    });

    const groupIsRuntimeDeclared =
      groupIsStatsDeclaredRuntimeField || evalCommandRuntimeFields.includes(pathSegment);

    if (isColumn(groupValue.definition)) {
      return handleStatsByColumnLeafOperation(cascadeOperationQuery, groupIsRuntimeDeclared, {
        [pathSegment]: nodePathMap[pathSegment],
      });
    } else if (isFunctionExpression(groupValue.definition)) {
      switch (groupValue.definition.name) {
        case 'categorize': {
          return handleStatsByCategorizeLeafOperation(
            cascadeOperationQuery,
            groupValue,
            nodePathMap
          );
        }
        default: {
          throw new Error(
            `The "${groupValue.definition.name}" function is not supported for leaf node operations`
          );
        }
      }
    }
  } else if (nodeType === 'group') {
    throw new Error('Group node operations are not yet supported');
  }
};

/**
 * @description adds a where command with current value for a matched column option as a side-effect on the passed query,
 * helps us with fetching leaf node data for stats operation in the data cascade experience.
 */
function handleStatsByColumnLeafOperation(
  cascadeOperationQuery: EsqlQuery,
  groupIsRuntimeDeclared: boolean,
  columnInterpolationRecord: Record<string, string>
): AggregateQuery {
  // build a where command with match expressions for the selected column
  const newCommands = Object.entries(columnInterpolationRecord).map(([key, value]) => {
    return Builder.command({
      name: 'where',
      args: [
        /* Number.isInteger(Number(value)) || groupIsRuntimeDeclared
          ? */ Builder.expression.func.binary('==', [
          Builder.expression.column({
            args: [Builder.identifier({ name: key })],
          }),
          Number.isInteger(Number(value))
            ? Builder.expression.literal.integer(Number(value))
            : Builder.expression.literal.string(value),
        ]),
        // : Builder.expression.func.call('match_phrase', [
        //     Builder.identifier({ name: key }),
        //     Builder.expression.literal.string(value),
        //   ]),
      ],
    });
  });

  newCommands.forEach((command) => {
    mutate.generic.commands.append(cascadeOperationQuery.ast, command);
  });

  return {
    esql: BasicPrettyPrinter.print(cascadeOperationQuery.ast),
  };
}

/**
 * Handles the stats command for a leaf operation that contains a categorize function by modifying the query and adding necessary commands.
 */
function handleStatsByCategorizeLeafOperation(
  cascadeOperationQuery: EsqlQuery,
  categorizeCommand: StatsFieldSummary,
  nodePathMap: Record<string, string>
): AggregateQuery {
  // build a where command with match expressions for the selected categorize function
  const categorizeWhereCommand = Builder.command({
    name: 'where',
    args: (categorizeCommand.definition as ESQLFunction<'variadic-call', 'categorize'>).args
      .map((arg) => {
        const namedColumn = categorizeCommand.column.name;

        const matchValue = nodePathMap[removeBackticks(namedColumn)];

        if (!matchValue) {
          return null;
        }

        let matchField = (arg as ESQLColumn).text;

        if (isFunctionExpression(arg)) {
          // this assumes that the function invoked is accepts a column as its first argument
          matchField = ((arg as ESQLFunction).args[0] as ESQLColumn).text;
        }

        return Builder.expression.func.call('match', [
          // this search doesn't work well on the keyword field when used with the match function, so we remove the keyword suffix to get the actual field name
          Builder.identifier({ name: matchField.replace(/\.keyword\b/i, '') }),
          Builder.expression.literal.string(extractCategorizeTokens(matchValue).join(' ')),
          Builder.expression.map({
            entries: [
              Builder.expression.entry(
                'auto_generate_synonyms_phrase_query',
                Builder.expression.literal.boolean(false)
              ),
              Builder.expression.entry('fuzziness', Builder.expression.literal.integer(0)),
              Builder.expression.entry('operator', Builder.expression.literal.string('AND')),
            ],
          }),
        ]);
      })
      .filter(Boolean) as ESQLAstItem[],
  });

  mutate.generic.commands.append(cascadeOperationQuery.ast, categorizeWhereCommand);

  return {
    esql: BasicPrettyPrinter.print(cascadeOperationQuery.ast),
  };
}

/**
 * Modifies the provided ESQL query to only include the specified columns in the stats by option.
 */
export function mutateQueryStatsGrouping(query: AggregateQuery, pick: string[]): AggregateQuery {
  const EditorESQLQuery = EsqlQuery.fromSrc(query.esql);

  const dataSourceCommand = getESQLQueryDataSourceCommand(EditorESQLQuery);

  if (!dataSourceCommand) {
    throw new Error('Query does not have a data source');
  }

  const statsCommands = Array.from(mutate.commands.stats.list(EditorESQLQuery.ast));

  if (statsCommands.length === 0) {
    throw new Error(`Query does not include a "stats" command`);
  }

  const { grouping: statsCommandToOperateOnGrouping, command: statsCommandToOperateOn } =
    getStatsCommandToOperateOn(EditorESQLQuery) ?? {};

  if (!statsCommandToOperateOn) {
    throw new Error(`No valid "stats" command was found in the query`);
  }

  const isValidPick = pick.every(
    (col) =>
      Object.keys(statsCommandToOperateOnGrouping!).includes(col) ||
      Object.keys(statsCommandToOperateOnGrouping!).includes(`\`${col}\``)
  );

  if (!isValidPick) {
    // nothing to do, return query as is
    return {
      esql: BasicPrettyPrinter.print(EditorESQLQuery.ast),
    };
  }

  // Create a modified stats command with only the specified column as args for the "by" option
  const modifiedStatsCommand = Builder.command({
    name: 'stats',
    args: statsCommandToOperateOn.args.map((statsCommandArg) => {
      if (isOptionNode(statsCommandArg) && statsCommandArg.name === 'by') {
        return Builder.option({
          name: statsCommandArg.name,
          args: statsCommandArg.args.reduce<Array<ESQLAstItem>>((acc, cur) => {
            if (isColumn(cur) && pick.includes(removeBackticks(cur.name))) {
              acc.push(
                Builder.expression.column({
                  args: [Builder.identifier({ name: cur.name })],
                })
              );
            } else if (
              isFunctionExpression(cur) &&
              isSupportedStatsFunction(
                cur.subtype === 'variadic-call'
                  ? cur.name
                  : (cur.args[1] as ESQLAstItem[]).find(isFunctionExpression)?.name ?? ''
              ) &&
              pick.includes(
                cur.subtype === 'variadic-call'
                  ? cur.text
                  : removeBackticks(cur.args.find(isColumn)?.name ?? '')
              )
            ) {
              acc.push(synth.exp(cur.text, { withFormatting: false }));
            }

            return acc;
          }, []),
        });
      }

      // leverage synth to clone the rest of the args since we'd want to use those parts as is
      return synth.exp((statsCommandArg as ESQLCommandOption).text, { withFormatting: false });
    }),
  });

  // Get the position of the original stats command
  const statsCommandIndex = EditorESQLQuery.ast.commands.findIndex(
    (cmd) => cmd.text === statsCommandToOperateOn.text
  );

  // remove stats command
  mutate.generic.commands.remove(EditorESQLQuery.ast, statsCommandToOperateOn);

  // insert modified stats command at same position previous one was at
  mutate.generic.commands.insert(EditorESQLQuery.ast, modifiedStatsCommand, statsCommandIndex);

  return {
    esql: BasicPrettyPrinter.print(EditorESQLQuery.ast),
  };
}

/**
 * Handles the computation and appending of a filtering where clause,
 * for ES|QL query containing a stats command in the cascade layout experience
 */
export const appendFilteringWhereClauseForCascadeLayout = <
  T extends SupportedFieldTypes | string = SupportedFieldTypes | string
>(
  query: string,
  fieldName: string,
  value: T extends SupportedFieldTypes ? FieldValue<T> : unknown,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  fieldType?: T extends SupportedFieldTypes ? T : string
) => {
  const ESQLQuery = EsqlQuery.fromSrc(query);

  const { ast } = ESQLQuery;

  const queryRuntimeFields = Array.from(mutate.commands.stats.summarize(ESQLQuery)).map(
    (command) => command.newFields
  );

  const fieldDeclarationCommandIndex = queryRuntimeFields.findIndex((field) =>
    field.has(fieldName)
  );

  const fieldIsRuntimeDeclared = fieldDeclarationCommandIndex >= 0;

  let fieldDeclarationCommand: StatsCommand | null = null;

  // if the field that's being filtered on is a new field created by some stats command in the query,
  // then we want to find the command that created it
  if (fieldIsRuntimeDeclared) {
    fieldDeclarationCommand = mutate.commands.stats.byIndex(
      ast,
      fieldDeclarationCommandIndex
    ) as StatsCommand;
  }

  const datasourceCommand = getESQLQueryDataSourceCommand(ESQLQuery);

  const insertionAnchorCommand = fieldDeclarationCommand ?? datasourceCommand;

  if (!insertionAnchorCommand) {
    throw new Error('No insertion anchor command found, nothing to do');
  }

  const insertionAnchorCommandIndex = ast.commands.findIndex(
    (cmd) => cmd.text === insertionAnchorCommand.text
  );

  // we would always want to insert our new query right after the insertion anchor command
  const filterInsertionIndex = insertionAnchorCommandIndex + 1;

  // since we can't anticipate the nature of the query we could be dealing with
  // we simply select the commands that exist from start of the query including the insertion anchor command
  const commandsBeforeInsertionAnchor = ast.commands.slice(0, filterInsertionIndex + 1);

  const filteringWhereCommandIndex = commandsBeforeInsertionAnchor.findLastIndex(
    (cmd) => cmd.name === 'where'
  );

  const { operator, expressionType } = getOperator(operation);

  // This is the computed expression for the filter operation that has been requested by the user
  const computedFilteringExpression =
    expressionType === 'postfix-unary'
      ? Builder.expression.func.postfix(operator, [Builder.identifier({ name: fieldName! })])
      : Builder.expression.func.binary(operator as BinaryExpressionComparisonOperator, [
          Builder.identifier({ name: fieldName! }),
          fieldType && isSupportedFieldType(fieldType)
            ? fieldType === 'boolean'
              ? Builder.expression.literal.boolean(value as boolean)
              : fieldType === 'string'
              ? Builder.expression.literal.string(value as string)
              : Builder.expression.literal[fieldType](value as number)
            : // when fieldType is not provided or supported, we default to string
              Builder.expression.literal.string(value as string),
        ]);

  if (filteringWhereCommandIndex < 0) {
    const filteringWhereCommand = Builder.command({
      name: 'where',
      args: [computedFilteringExpression],
    });

    mutate.generic.commands.insert(ast, filteringWhereCommand, filterInsertionIndex);

    return BasicPrettyPrinter.print(ast);
  }

  const filteringWhereCommand = commandsBeforeInsertionAnchor[filteringWhereCommandIndex];

  let modifiedFilteringWhereCommand: ESQLCommand | null = null;

  // the where command itself typically only accepts a single expression as its argument
  // if it's not a named "and" binary expression, we'll treat it as a command that has only one expression,
  // hence we only need to either replace it with a new one or append a new one
  if (
    isBinaryExpression(filteringWhereCommand.args[0]) &&
    filteringWhereCommand.args[0].name !== 'and'
  ) {
    const binaryExpression = filteringWhereCommand
      .args[0] as ESQLBinaryExpression<BinaryExpressionWhereOperator>;
    const [left] = binaryExpression.args;

    modifiedFilteringWhereCommand =
      (left as ESQLColumn).name === fieldName
        ? // when the expression's left hand's value matches the target field we're trying to filter on, we simply replace it with the new expression
          synth.cmd`WHERE ${computedFilteringExpression}`
        : synth.cmd`WHERE ${computedFilteringExpression} AND ${binaryExpression}`;
  } else if (
    isBinaryExpression(filteringWhereCommand.args[0]) &&
    filteringWhereCommand.args[0].name === 'and'
  ) {
    modifiedFilteringWhereCommand = synth.cmd`WHERE ${computedFilteringExpression} AND ${filteringWhereCommand.args[0]}`;
  }

  // if we where able to create a new filtering where command, we need to add it in and remove the old one
  if (modifiedFilteringWhereCommand) {
    mutate.generic.commands.insert(ast, modifiedFilteringWhereCommand, filteringWhereCommandIndex);
    mutate.generic.commands.remove(ast, filteringWhereCommand);
  }

  return BasicPrettyPrinter.print(ast);
};
