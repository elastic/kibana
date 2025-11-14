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
  Walker,
} from '@kbn/esql-ast';
import type {
  StatsCommandSummary,
  StatsFieldSummary,
} from '@kbn/esql-ast/src/mutate/commands/stats';
import type {
  BinaryExpressionComparisonOperator,
  BinaryExpressionWhereOperator,
  ESQLBinaryExpression,
  ESQLLiteral,
} from '@kbn/esql-ast/src/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { extractCategorizeTokens } from './extract_categorize_tokens';
import { getOperator, PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING } from './append_to_query';

type NodeType = 'group' | 'leaf';

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

// if value is a text or keyword field and it's not "aggregatable", we opt to use match phrase for the where command
const requiresMatchPhrase = (fieldName: string, dataViewFields: DataView['fields']) => {
  const dataViewField = dataViewFields.getByName(fieldName);

  return (
    (dataViewField?.spec.esTypes?.includes('text') ||
      dataViewField?.spec.esTypes?.includes('keyword')) &&
    !dataViewField?.spec.aggregatable
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

  // accounting for the possibility of multiple stats commands in the query,
  // we always want to operate on the last stats command
  const summarizedStatsCommand = mutate.commands.stats.summarizeCommand(
    esqlQuery,
    statsCommands[statsCommands.length - 1]
  );

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
 * Returns the summary of the stats command at the given command index in the esql query
 */
function getStatsCommandAtIndexSummary(esqlQuery: EsqlQuery, commandIndex: number) {
  const declarationCommand = mutate.commands.stats.byIndex(esqlQuery.ast, commandIndex);

  if (!declarationCommand) {
    return null;
  }

  return mutate.commands.stats.summarizeCommand(esqlQuery, declarationCommand);
}

function getFieldParamDefinition(
  fieldName: string,
  fieldTerminals: StatsFieldSummary['terminals'],
  esqlVariables: ESQLControlVariable[] | undefined
): string | undefined {
  const fieldParamDef = fieldTerminals.find(
    (arg) => arg.text === fieldName && arg.type === 'literal' && arg.literalType === 'param'
  ) as ESQLLiteral | undefined;

  if (fieldParamDef) {
    const controlVariable = esqlVariables?.find((variable) => variable.key === fieldParamDef.value);

    if (!controlVariable) {
      throw new Error(`The control variable for the "${fieldName}" column was not found`);
    }

    return controlVariable.value as string;
  }
}

export const getESQLStatsQueryMeta = (queryString: string): ESQLStatsQueryMeta => {
  const groupByFields: ESQLStatsQueryMeta['groupByFields'] = [];
  const appliedFunctions: ESQLStatsQueryMeta['appliedFunctions'] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  const summarizedStatsCommand = getStatsCommandToOperateOn(esqlQuery);

  if (!summarizedStatsCommand || Object.keys(summarizedStatsCommand?.grouping ?? {}).length === 0) {
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
      groupDeclarationCommandIndex >= 0 &&
      (groupDeclarationCommandSummary = getStatsCommandAtIndexSummary(
        esqlQuery,
        groupDeclarationCommandIndex
      ))
    ) {
      // update the group field node to it's actual definition
      groupFieldNode = groupDeclarationCommandSummary.grouping[groupFieldName];
    }

    // check if there is a where command after the operating stats command targeting any of it's grouping options
    const whereCommandGroupFieldSearch = esqlQuery.ast.commands
      .slice(groupDeclarationCommandIndex)
      .find((cmd) => {
        if (cmd.name !== 'where') {
          return false;
        }

        let found = false;

        Walker.walk(cmd, {
          visitIdentifier: (node) => {
            if (found) {
              return;
            }

            if (node.name === groupFieldName) {
              found = true;
            }
          },
        });

        return found;
      });

    if (whereCommandGroupFieldSearch) {
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
   * data view for the query
   */
  dataView: DataView;
  /**
   * anchor query for generating the next valid query
   */
  query: AggregateQuery;
  /**
   * ESQL variables for the query
   */
  esqlVariables: ESQLControlVariable[] | undefined;
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
  dataView,
  esqlVariables,
  nodeType,
  nodePath,
  nodePathMap,
}: CascadeQueryArgs): AggregateQuery | undefined => {
  const EditorESQLQuery = EsqlQuery.fromSrc(query.esql);

  if (EditorESQLQuery.errors.length) {
    throw new Error('Query is malformed');
  }

  const summarizedStatsCommand = getStatsCommandToOperateOn(EditorESQLQuery);

  if (!summarizedStatsCommand || Object.keys(summarizedStatsCommand?.grouping ?? {}).length === 0) {
    throw new Error('Query does not have a valid stats command with grouping options');
  }

  if (nodeType === 'leaf') {
    const pathSegment = nodePath[nodePath.length - 1];

    // we make an initial assumption that the field was declared by the stats command being operated on
    let fieldDeclarationCommandSummary = summarizedStatsCommand;

    // if field name is not marked as a new field then we want ascertain it wasn't created by a preceding stats command
    if (!fieldDeclarationCommandSummary.newFields.has(pathSegment)) {
      const statsCommandRuntimeFields = getStatsCommandRuntimeFields(EditorESQLQuery);

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

      fieldDeclarationCommandSummary =
        groupDeclarationCommandSummary ?? fieldDeclarationCommandSummary;
    }

    const groupValue =
      fieldDeclarationCommandSummary.grouping[pathSegment] ??
      // when a column name is not assigned on using a grouping function, one is created automatically from the function expression that includes backticks
      fieldDeclarationCommandSummary.grouping[`\`${pathSegment}\``];

    if (
      // check if we have a value for the path segment in the node path map to match on
      !(groupValue && nodePathMap[pathSegment] !== undefined)
    ) {
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
        // as we would have already selected the definition of the field if our operation stats command references it
        return;
      }

      mutate.generic.commands.append(cascadeOperationQuery.ast, cmd);
    });

    if (isColumn(groupValue.definition)) {
      return handleStatsByColumnLeafOperation(
        cascadeOperationQuery,
        groupValue,
        dataView.fields,
        esqlVariables,
        nodePathMap[pathSegment]
      );
    } else if (isFunctionExpression(groupValue.definition)) {
      switch (groupValue.definition.name) {
        case 'categorize': {
          return handleStatsByCategorizeLeafOperation(
            cascadeOperationQuery,
            groupValue,
            esqlVariables,
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
 * helps us with fetching documents that match the value of a specified column on a stats operation in the data cascade experience.
 */
function handleStatsByColumnLeafOperation(
  cascadeOperationQuery: EsqlQuery,
  columnNode: StatsFieldSummary,
  dataViewFields: DataView['fields'],
  esqlVariables: ESQLControlVariable[] | undefined,
  operationValue: unknown
): AggregateQuery {
  let operationColumnName = columnNode.definition.name;

  let operationColumnNameParamValue;

  if (
    (operationColumnNameParamValue = getFieldParamDefinition(
      operationColumnName,
      columnNode.terminals,
      esqlVariables
    ))
  ) {
    operationColumnName = operationColumnNameParamValue;
  }

  const useMatchPhrase = requiresMatchPhrase(operationColumnName, dataViewFields);

  // build a where command with match expressions for the selected column
  const filterCommand = Builder.command({
    name: 'where',
    args: [
      useMatchPhrase
        ? Builder.expression.func.call('match_phrase', [
            Builder.identifier({ name: operationColumnName }),
            Builder.expression.literal.string(operationValue as string),
          ])
        : Builder.expression.func.binary('==', [
            Builder.expression.column({
              args: [Builder.identifier({ name: operationColumnName })],
            }),
            Number.isNaN(Number(operationValue))
              ? Builder.expression.literal.string(operationValue as string)
              : Builder.expression.literal.integer(Number(operationValue)),
          ]),
    ],
  });

  mutate.generic.commands.append(cascadeOperationQuery.ast, filterCommand);

  return {
    esql: BasicPrettyPrinter.print(cascadeOperationQuery.ast),
  };
}

/**
 * Handles the stats command for a leaf operation that contains a categorize function by modifying the query and adding necessary commands.
 */
function handleStatsByCategorizeLeafOperation(
  cascadeOperationQuery: EsqlQuery,
  categorizeCommandNode: StatsFieldSummary,
  esqlVariables: ESQLControlVariable[] | undefined,
  nodePathMap: Record<string, string>
): AggregateQuery {
  // we select the first argument because that's the field being categorized {@see https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/grouping-functions#esql-categorize | here}
  const categorizedField = (
    categorizeCommandNode.definition as ESQLFunction<'variadic-call', 'categorize'>
  ).args[0];

  let categorizedFieldName: string;

  if (isFunctionExpression(categorizedField)) {
    // this assumes that the function invoked is accepts a column as its first argument and is not in itself another function
    categorizedFieldName = ((categorizedField as ESQLFunction).args[0] as ESQLColumn).text;
  } else {
    categorizedFieldName = (categorizedField as ESQLColumn).name;

    let categorizedFieldNameParamValue;

    if (
      (categorizedFieldNameParamValue = getFieldParamDefinition(
        categorizedFieldName,
        categorizeCommandNode.terminals,
        esqlVariables
      ))
    ) {
      categorizedFieldName = categorizedFieldNameParamValue;
    }
  }

  const matchValue = nodePathMap[removeBackticks(categorizeCommandNode.column.name)];

  // build a where command with match expressions for the selected categorize function
  const categorizeWhereCommand = Builder.command({
    name: 'where',
    args: [
      Builder.expression.func.call('match', [
        // this search doesn't work well on the keyword field when used with the match function, so we remove the keyword suffix to get the actual field name
        Builder.identifier({ name: categorizedFieldName.replace(/\.keyword\b/i, '') }),
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
      ]),
    ],
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
              acc.push(synth.exp(cur.text, { withFormatting: false }));
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
  esqlVariables: ESQLControlVariable[] | undefined,
  dataView: DataView,
  fieldName: string,
  value: T extends SupportedFieldTypes ? FieldValue<T> : unknown,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  fieldType?: T extends SupportedFieldTypes ? T : string
) => {
  const ESQLQuery = EsqlQuery.fromSrc(query);

  // we make an initial assumption that the filtering operation's target field was declared by the stats command driving the cascade experience
  let fieldDeclarationCommandSummary = getStatsCommandToOperateOn(ESQLQuery)!;

  const isFieldUsedInOperatingStatsCommand = fieldDeclarationCommandSummary.grouping[fieldName];

  // create placeholder for the insertion anchor command which is the command that is most suited to accept the user's requested filtering operation
  let insertionAnchorCommand: ESQLCommand;

  // create placeholder for a flag to indicate if the field was declared in a stats command
  let isFieldRuntimeDeclared = false;

  // placeholder for the computed expression of the filter operation that has been requested by the user
  let computedFilteringExpression: ESQLAstItem;

  if (isFieldUsedInOperatingStatsCommand) {
    // if the field name is marked as a new field then we know it was declared by the stats command driving the cascade experience,
    // so we set the flag to true and use the stats command as the insertion anchor command
    if (fieldDeclarationCommandSummary.newFields.has(fieldName)) {
      isFieldRuntimeDeclared = true;
    } else {
      // otherwise, we need to ascertain that the field was not created by a preceding stats command
      // so we check the runtime fields created by the stats commands in the query to see if the field was declared in one of them
      const statsCommandRuntimeFields = getStatsCommandRuntimeFields(ESQLQuery);

      // attempt to find the index of the stats command that declared the field
      const groupDeclarationCommandIndex = statsCommandRuntimeFields.findIndex((field) =>
        field.has(fieldName)
      );

      // if the field was declared in a stats command, then we set the flag to true
      isFieldRuntimeDeclared = groupDeclarationCommandIndex >= 0;

      let groupDeclarationCommandSummary: StatsCommandSummary | null = null;

      if (isFieldRuntimeDeclared) {
        groupDeclarationCommandSummary = getStatsCommandAtIndexSummary(
          ESQLQuery,
          groupDeclarationCommandIndex
        );
      }

      fieldDeclarationCommandSummary =
        groupDeclarationCommandSummary ?? fieldDeclarationCommandSummary;
    }

    insertionAnchorCommand = fieldDeclarationCommandSummary.command;

    let fieldNameParamValue;

    if (
      (fieldNameParamValue = getFieldParamDefinition(
        fieldName,
        fieldDeclarationCommandSummary.grouping[fieldName].terminals,
        esqlVariables
      ))
    ) {
      fieldName = fieldNameParamValue;
    }
  } else {
    // if the requested field doesn't exist on the stats command that's driving the cascade experience,
    // then the requested field is a field on the index data given this, we opt to use the data source command as the insertion anchor command
    insertionAnchorCommand = getESQLQueryDataSourceCommand(ESQLQuery)!;
  }

  const { operator, expressionType } = getOperator(operation);

  // if the value being filtered on is not "aggregatable" and is either a text or keyword field, we opt to use match phrase for the where command
  const useMatchPhrase = requiresMatchPhrase(fieldName, dataView.fields);

  if (useMatchPhrase) {
    const matchPhraseExpression = Builder.expression.func.call('match_phrase', [
      Builder.identifier({ name: fieldName! }),
      Builder.expression.literal.string(value as string),
    ]);

    computedFilteringExpression =
      expressionType === 'postfix-unary'
        ? Builder.expression.func.postfix(operator, [matchPhraseExpression])
        : operator === '!='
        ? Builder.expression.func.unary('not', [matchPhraseExpression])
        : matchPhraseExpression;
  } else {
    computedFilteringExpression =
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
              Number.isNaN(Number(value))
              ? Builder.expression.literal.string(value as string)
              : Builder.expression.literal.integer(value as number),
          ]);
  }

  const insertionAnchorCommandIndex = ESQLQuery.ast.commands.findIndex(
    (cmd) => cmd.text === insertionAnchorCommand.text
  );

  // since we can't anticipate the nature of the query we could be dealing with
  // when its a runtime field or not used in the operating stats command, we need to insert the new where command right after the insertion anchor command
  // otherwise we insert it right before the insertion anchor command
  const commandsFollowingInsertionAnchor =
    !isFieldUsedInOperatingStatsCommand || isFieldRuntimeDeclared
      ? ESQLQuery.ast.commands.slice(insertionAnchorCommandIndex, insertionAnchorCommandIndex + 2)
      : ESQLQuery.ast.commands.slice(
          insertionAnchorCommandIndex - 1,
          insertionAnchorCommandIndex + 1
        );

  // we search to see if there already exists a where command that applies to our insertion anchor command
  const filteringWhereCommandIndex = commandsFollowingInsertionAnchor.findIndex(
    (cmd) => cmd.name === 'where'
  );

  if (filteringWhereCommandIndex < 0) {
    const filteringWhereCommand = Builder.command({
      name: 'where',
      args: [computedFilteringExpression],
    });

    mutate.generic.commands.insert(
      ESQLQuery.ast,
      filteringWhereCommand,
      // when the field is a runtime field or not used in the operating stats command, we insert the new where command right after the insertion anchor command
      // otherwise we insert it right before the insertion anchor command
      !isFieldUsedInOperatingStatsCommand || isFieldRuntimeDeclared
        ? insertionAnchorCommandIndex + 1
        : insertionAnchorCommandIndex
    );

    return BasicPrettyPrinter.print(ESQLQuery.ast);
  }

  const filteringWhereCommand = commandsFollowingInsertionAnchor[filteringWhereCommandIndex];

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
    const insertionIndex = ESQLQuery.ast.commands.findIndex(
      (cmd) => cmd.text === filteringWhereCommand.text
    );

    mutate.generic.commands.insert(ESQLQuery.ast, modifiedFilteringWhereCommand, insertionIndex);
    mutate.generic.commands.remove(ESQLQuery.ast, filteringWhereCommand);
  }

  return BasicPrettyPrinter.print(ESQLQuery.ast);
};
