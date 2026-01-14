/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery, getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import {
  BasicPrettyPrinter,
  Builder,
  EsqlQuery,
  isColumn,
  isFunctionExpression,
  isSubQuery,
  mutate,
  synth,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLAstItem,
  type ESQLColumn,
  isBinaryExpression,
  Walker,
} from '@kbn/esql-language';
import type {
  StatsCommandSummary,
  StatsFieldSummary,
} from '@kbn/esql-language/src/ast/mutate/commands/stats';
import type {
  BinaryExpressionComparisonOperator,
  ESQLBinaryExpression,
  ESQLUnaryExpression,
  ESQLPostfixUnaryExpression,
  ESQLLiteral,
} from '@kbn/esql-language/src/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { extractCategorizeTokens } from './extract_categorize_tokens';
import { getOperator, PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING } from './append_to_query/utils';

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
  let dataViewField = dataViewFields.getByName(fieldName);

  const multiSubtype = dataViewField && getDataViewFieldSubtypeMulti(dataViewField);

  if (multiSubtype) {
    // if the field is a subtype, we want to use the parent field to determine wether to use the match phrase
    dataViewField = dataViewFields.getByName(multiSubtype.multi.parent);
  }

  return (
    (dataViewField?.esTypes?.includes('text') || dataViewField?.esTypes?.includes('keyword')) &&
    !dataViewField?.aggregatable
  );
};

export function getStatsCommandToOperateOn(esqlQuery: EsqlQuery): StatsCommandSummary | null {
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

export function getFieldParamDefinition(
  fieldName: string,
  fieldTerminals: StatsFieldSummary['terminals'],
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
  T extends StatsFieldSummary | undefined,
  R = T extends StatsFieldSummary ? string : undefined
>(groupByFields: T): R {
  if (!groupByFields) {
    return undefined as R;
  }

  return (
    groupByFields.definition.type === 'function'
      ? groupByFields.definition.name
      : groupByFields.definition.type
  ) as R;
}

export const getESQLStatsQueryMeta = (queryString: string): ESQLStatsQueryMeta => {
  const groupByFields: ESQLStatsQueryMeta['groupByFields'] = [];
  const appliedFunctions: ESQLStatsQueryMeta['appliedFunctions'] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  const dataSourceCommand = getESQLQueryDataSourceCommand(esqlQuery);
  const summarizedStatsCommand = getStatsCommandToOperateOn(esqlQuery);
  const operatingStatsCommandIndex = esqlQuery.ast.commands.findIndex(
    (cmd) => cmd.text === summarizedStatsCommand?.command.text
  );

  if (
    dataSourceCommand?.args.some(isSubQuery) ||
    !summarizedStatsCommand ||
    Object.keys(summarizedStatsCommand?.grouping ?? {}).length === 0
  ) {
    return { groupByFields, appliedFunctions };
  }

  const grouping = Object.values(summarizedStatsCommand.grouping);

  for (let j = 0; j < grouping.length; j++) {
    const group = grouping[j];

    if (!group.definition) {
      // query received is malformed without complete grouping definition, there's no need to proceed further
      return { groupByFields: [], appliedFunctions: [] };
    }

    // unnamed grouping functions are wrapped in backticks in the generated AST so we strip them off if they exist,
    // so the value displayed in the UI is the same as the value used in the query
    const groupFieldName = removeBackticks(group.field);

    // this is a placeholder for the index of the stats command that declared the group field
    // we start off assuming it's index is the same as the stats command we are operating on,
    // it however will be updated if the group field is determined to be declared by some other stats command
    let groupDeclarationStatsCommandIndex = operatingStatsCommandIndex;

    // this is a placeholder for the group field node,
    // it will be updated to the actual definition of the group field if it was declared by a preceding stats command
    let groupFieldNode = group;

    if (!summarizedStatsCommand.newFields.has(groupFieldName)) {
      // get all the new fields created by the stats commands in the query,
      // so we might tell if the command we are operating on is referencing a field that was defined by a preceding command
      const statsCommandRuntimeFields = getStatsCommandRuntimeFields(esqlQuery);

      const groupDeclarationStatsCommandLookupIndex = statsCommandRuntimeFields.findIndex((field) =>
        field.has(groupFieldName)
      );

      let groupDeclarationCommandSummary: StatsCommandSummary | null = null;

      if (
        groupDeclarationStatsCommandLookupIndex >= 0 &&
        (groupDeclarationCommandSummary = getStatsCommandAtIndexSummary(
          esqlQuery,
          groupDeclarationStatsCommandLookupIndex
        ))
      ) {
        groupDeclarationStatsCommandIndex = groupDeclarationStatsCommandLookupIndex;
        // update the group field node to it's actual definition
        groupFieldNode = groupDeclarationCommandSummary.grouping[groupFieldName];
      }
    }

    // given that keep commands strip fields from the resulting records,
    // we need to ascertain that if a keep command exists after the operating stats command, it specifies the current group field
    const offendingKeepCommand = esqlQuery.ast.commands
      .slice(groupDeclarationStatsCommandIndex)
      .reduce((acc, cmd) => {
        if (cmd.name !== 'keep') {
          return acc || false;
        }

        let offending = false;

        Walker.walk(cmd, {
          visitColumn: (node) => {
            // if we don't find a node that targets the current group field,
            // then we know the keep command is invalidating the possibility of grouping by the current group field
            offending = node.name !== groupFieldName;
          },
        });

        return acc || offending;
      }, false);

    if (offendingKeepCommand) {
      // we found a keep command that strips the current group field from the resulting records,
      // so we break out of the loop as that invalidates the possibility of grouping by the current group field
      break;
    }

    // check if there is a where command after the operating stats command targeting any of it's grouping options
    const whereCommandGroupFieldSearch = esqlQuery.ast.commands
      .slice(groupDeclarationStatsCommandIndex)
      .find((cmd) => {
        if (cmd.name !== 'where') {
          return false;
        }

        let found = false;

        Walker.walk(cmd, {
          visitColumn: (node) => {
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
        type: getStatsGroupFieldType(groupFieldNode),
      });

      break;
    }

    if (
      isFunctionExpression(groupFieldNode.definition) &&
      !isSupportedStatsFunction(groupFieldNode.definition.name)
    ) {
      continue;
    }

    groupByFields.push({
      field: groupFieldName,
      type: getStatsGroupFieldType(groupFieldNode),
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

    if (isColumn(groupValue.definition)) {
      return handleStatsByColumnLeafOperation(
        EditorESQLQuery,
        operatingStatsCommandIndex,
        groupValue,
        dataView.fields,
        esqlVariables,
        nodePathMap[pathSegment]
      );
    } else if (isFunctionExpression(groupValue.definition)) {
      switch (groupValue.definition.name) {
        case 'categorize': {
          return handleStatsByCategorizeLeafOperation(
            EditorESQLQuery,
            operatingStatsCommandIndex,
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
  editorQuery: EsqlQuery,
  operatingStatsCommandIndex: number,
  columnNode: StatsFieldSummary,
  dataViewFields: DataView['fields'],
  esqlVariables: ESQLControlVariable[] | undefined,
  operationValue: unknown
): AggregateQuery {
  // create a new query to populate with the cascade operation query
  const cascadeOperationQuery = EsqlQuery.fromSrc('');

  let operationColumnName = columnNode.definition.name;

  let operationColumnNameParamValue;

  if (
    (operationColumnNameParamValue = getFieldParamDefinition(
      operationColumnName,
      columnNode.terminals,
      esqlVariables
    ))
  ) {
    if (typeof operationColumnNameParamValue === 'string') {
      // we expect the operation column name parameter value to be a string, so we check for that and update the operation column name to the param value if it is
      operationColumnName = operationColumnNameParamValue;
    }
  }

  const shouldUseMatchPhrase = requiresMatchPhrase(operationColumnName, dataViewFields);

  // include all the existing commands up to the operating stats command in the cascade operation query
  editorQuery.ast.commands.slice(0, operatingStatsCommandIndex + 1).forEach((cmd, idx, arr) => {
    if (idx === arr.length - 1 && cmd.name === 'stats') {
      const hasAggregates = cmd.args.some(isFunctionExpression);

      if (hasAggregates && !shouldUseMatchPhrase) {
        // We know the operating stats command is the last command in the array,
        // so we modify it into an INLINE STATS command
        mutate.generic.commands.append(
          cascadeOperationQuery.ast,
          synth.cmd(`INLINE ${BasicPrettyPrinter.print(cmd)}`, { withFormatting: false })
        );
      } else {
        // if the stats command does not have any aggregates, or will require a match phrase query,
        // then we omit the STATS command to simply apply the where command to the query
        return;
      }
    } else {
      mutate.generic.commands.append(cascadeOperationQuery.ast, cmd);
    }
  });

  // build a where command with match expressions for the selected column
  const filterCommand = Builder.command({
    name: 'where',
    args: [
      shouldUseMatchPhrase
        ? Builder.expression.func.call('match_phrase', [
            Builder.identifier({ name: operationColumnName }),
            Builder.expression.literal.string(operationValue as string),
          ])
        : Builder.expression.func.binary('==', [
            Builder.expression.column({
              args: [Builder.identifier({ name: operationColumnName })],
            }),
            Number.isNaN(Number(operationValue)) ||
            dataViewFields.getByName(operationColumnName)?.type === 'string'
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
  editorQuery: EsqlQuery,
  operatingStatsCommandIndex: number,
  categorizeCommandNode: StatsFieldSummary,
  esqlVariables: ESQLControlVariable[] | undefined,
  nodePathMap: Record<string, string>
): AggregateQuery {
  // create a new query to populate with the cascade operation query
  const cascadeOperationQuery = EsqlQuery.fromSrc('');

  // include all the existing commands right up until the operating stats command
  editorQuery.ast.commands.slice(0, operatingStatsCommandIndex).forEach((cmd, idx, arr) => {
    if (idx === arr.length - 1 && (cmd.name === 'stats' || cmd.name === 'sample')) {
      // however, when the last command is a stats command, we don't want to include it in the cascade operation query
      // since WHERE commands that use either the MATCH or MATCH_PHRASE function cannot be immediately followed by a STATS command
      // and moreover this STATS command doesn't provide any useful context even if it defines new runtime fields
      // as we would have already selected the definition of the field if our operation stats command references it.
      // Similarly, when the last command is a SAMPLE command, we don't want to include it in the cascade operation query since we want all matching documents to be considered.
      return;
    }

    mutate.generic.commands.append(cascadeOperationQuery.ast, cmd);
  });

  // we select the first argument because that's the field being categorized
  // {@link https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/grouping-functions#esql-categorize | here}
  const categorizedField = (
    categorizeCommandNode.definition as ESQLFunction<'variadic-call', 'categorize'>
  ).args[0];

  let categorizedFieldName: string;

  if (isFunctionExpression(categorizedField)) {
    // this assumes that the function invoked accepts a column as its first argument and is not in itself another function invocation
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
      if (typeof categorizedFieldNameParamValue === 'string') {
        // we expect the categorized field name parameter value to be a string, so we check for that and update the categorized field name to the param value if it is
        categorizedFieldName = categorizedFieldNameParamValue;
      }
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

  // when the grouping option is an unnamed function, it's wrapped in backticks in the generated AST so we test for that first, else we assume this does not apply
  const rawFieldName = fieldDeclarationCommandSummary.grouping[`\`${fieldName}\``]
    ? `\`${fieldName}\``
    : fieldName;

  // This is a placeholder for the normalized field name returned by the parser,
  // and in the case where we received a field name that maps to a variable, it's value will be the field's variable value
  let normalizedFieldName = rawFieldName;

  const isFieldUsedInOperatingStatsCommand = Boolean(
    fieldDeclarationCommandSummary.grouping[rawFieldName]
  );

  // create placeholder for the insertion anchor command which is the command that is most suited to accept the user's requested filtering operation
  let insertionAnchorCommand: ESQLCommand;

  // create placeholder for a flag to indicate if the field was declared in a stats command
  let isFieldRuntimeDeclared = false;

  // placeholder for the computed expression of the filter operation that has been requested by the user
  let computedFilteringExpression: ESQLAstItem;

  if (isFieldUsedInOperatingStatsCommand) {
    // if the field name is marked as a new field then we know it was declared by the stats command driving the cascade experience,
    // so we set the flag to true and use the stats command as the insertion anchor command
    if (fieldDeclarationCommandSummary.newFields.has(rawFieldName)) {
      isFieldRuntimeDeclared = true;
    } else {
      // otherwise, we need to ascertain that the field was not created by a preceding stats command
      // so we check the runtime fields created by the stats commands in the query to see if the field was declared in one of them
      const statsCommandRuntimeFields = getStatsCommandRuntimeFields(ESQLQuery);

      // attempt to find the index of the stats command that declared the field
      const groupDeclarationCommandIndex = statsCommandRuntimeFields.findIndex((field) =>
        field.has(rawFieldName)
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
    const fieldDeclaration = fieldDeclarationCommandSummary.grouping[rawFieldName];

    if (
      (fieldNameParamValue = getFieldParamDefinition(
        fieldName,
        fieldDeclaration.terminals,
        esqlVariables
      ))
    ) {
      if (typeof fieldNameParamValue === 'string') {
        // we expect the field name parameter value to be a string, so we check for that and update the normalized field name to the param value if it is
        normalizedFieldName = fieldNameParamValue;
      }
    } else {
      // This corrects for scenarios in the initial query where the user doesn't adhere to the expected syntax for calling a function,
      // especially when the function is unnamed for example if the user inputs "CATEGORIZE (message)" elasticsearch is able to understand this because the parser fixes it, and precisely because of that is why
      // we can't use this as-is when constructing the filtering query, so we appropriately extract correct value from the parsed AST
      normalizedFieldName =
        isFunctionExpression(fieldDeclaration.arg) &&
        fieldDeclaration.arg.subtype === 'variadic-call'
          ? fieldDeclaration.definition.text
          : fieldDeclaration.column.name;
    }
  } else {
    // if the requested field doesn't exist on the stats command that's driving the cascade experience,
    // then the requested field is a field on the index data given this, we opt to use the data source command as the insertion anchor command
    insertionAnchorCommand = getESQLQueryDataSourceCommand(ESQLQuery)!;
  }

  const { operator, expressionType } = getOperator(operation);

  // if the value being filtered on is not "aggregatable" and is either a text or keyword field, we opt to use match phrase for the where command
  const shouldUseMatchPhrase = requiresMatchPhrase(normalizedFieldName, dataView.fields);

  if (shouldUseMatchPhrase) {
    const matchPhraseExpression = Builder.expression.func.call('match_phrase', [
      Builder.identifier({ name: removeBackticks(normalizedFieldName) }),
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
        ? Builder.expression.func.postfix(operator, [
            Builder.identifier({ name: removeBackticks(normalizedFieldName) }),
          ])
        : Builder.expression.func.binary(operator as BinaryExpressionComparisonOperator, [
            Builder.identifier({ name: removeBackticks(normalizedFieldName) }),
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

  // the where command itself represents it's expressions as a single argument that could a series of nested left and right expressions
  // hence why only access the first argument.
  const filteringExpression = filteringWhereCommand.args[0] as
    | ESQLBinaryExpression
    | ESQLUnaryExpression
    | ESQLPostfixUnaryExpression;

  if (isBinaryExpression(filteringExpression) && filteringExpression.name === 'and') {
    // This is already a combination of some conditions, for now we'll just append the new condition to the existing one
    modifiedFilteringWhereCommand = synth.cmd`WHERE ${computedFilteringExpression} AND ${filteringExpression}`;
  } else {
    modifiedFilteringWhereCommand =
      isBinaryExpression(filteringExpression) &&
      (filteringExpression.args[0] as ESQLColumn).name === normalizedFieldName
        ? // when the expression is a binary expression and it's left hand's value matches the target field we're trying to filter on, we simply replace it with the new expression
          synth.cmd`WHERE ${computedFilteringExpression}`
        : synth.cmd`WHERE ${computedFilteringExpression} AND ${filteringExpression}`;
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
