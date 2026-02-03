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
  BinaryExpressionComparisonOperator,
  ESQLBinaryExpression,
  ESQLUnaryExpression,
  ESQLPostfixUnaryExpression,
} from '@kbn/esql-language/src/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { FieldSummary } from '@kbn/esql-language/src/commands/registry/types';
import { getUsedFields, getFieldTerminals, getFieldDefinitionFromArg } from '../esql_fields_utils';
import { extractCategorizeTokens } from '../extract_categorize_tokens';
import { getOperator } from '../append_to_query/utils';
import {
  isSupportedStatsFunction,
  type SupportedFieldTypes,
  type FieldValue,
  type StatsCommandSummary,
  getESQLQueryDataSourceCommand,
  getStatsCommandToOperateOn,
  getStatsCommandRuntimeFields,
  getStatsCommandAtIndexSummary,
  getFieldParamDefinition,
  getStatsGroupFieldType,
  removeBackticks,
  isSupportedFieldType,
  requiresMatchPhrase,
  isCategorizeFunctionWithFunctionArgument,
} from './utils';

type NodeType = 'group' | 'leaf';

export interface AppliedStatsFunction {
  identifier: string;
  aggregation: string;
}

export interface ESQLStatsQueryMeta {
  groupByFields: Array<{ field: string; type: string }>;
  appliedFunctions: AppliedStatsFunction[];
}

/**
 * This method is used to get the metadata on STATS command to drive the cascade experience from an ESQL query,
 * if a valid STATS command is found information about the group by fields and applied functions is returned.
 * This method will exclude queries contain commands that are not valid for the cascade experience,
 */
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

    const groupDefinition = getFieldDefinitionFromArg(group.arg);
    if (!groupDefinition) {
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

    const statsCommandRuntimeFields = getStatsCommandRuntimeFields(esqlQuery);
    const lastStatsCommandFields = statsCommandRuntimeFields[statsCommandRuntimeFields.length - 1];

    if (!lastStatsCommandFields.has(groupFieldName)) {
      // get all the new fields created by the stats commands in the query,
      // so we might tell if the command we are operating on is referencing a field that was defined by a preceding command
      const groupDeclarationStatsCommandLookupIndex = statsCommandRuntimeFields.findIndex((field) =>
        field.has(group.field)
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
        groupFieldNode = groupDeclarationCommandSummary.grouping[group.field];
      }
    }

    const groupFieldDefinition = getFieldDefinitionFromArg(groupFieldNode.arg);
    if (
      isFunctionExpression(groupFieldDefinition) &&
      (!isSupportedStatsFunction(groupFieldDefinition.name) ||
        isCategorizeFunctionWithFunctionArgument(groupFieldDefinition))
    ) {
      // if the group field has a grouping function that is not supported,
      // this nullifies the entire query to count as a valid query for the cascade experience
      groupByFields.splice(0, groupByFields.length);
      break;
    }

    // given that keep commands strip fields from the resulting records,
    // we need to ascertain that if a keep command exists after the operating stats command,
    // it specifies the current group field
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
            // then we know the keep command is invalidating
            // the possibility of grouping by the current group field
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

    groupByFields.push({
      field: groupFieldName,
      type: getStatsGroupFieldType(groupFieldNode),
    });
  }

  if (groupByFields.length === 0) {
    return { groupByFields, appliedFunctions };
  }

  Object.values(summarizedStatsCommand.aggregates).forEach((aggregate) => {
    const aggregateFieldDefinition = getFieldDefinitionFromArg(aggregate.arg);
    appliedFunctions.push({
      identifier: removeBackticks(aggregate.field), // we remove backticks to have a clean identifier that gets displayed in the UI
      aggregation:
        (aggregateFieldDefinition as ESQLFunction).operator?.name ?? aggregateFieldDefinition.text,
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
    const statsCommandRuntimeFields = getStatsCommandRuntimeFields(EditorESQLQuery);
    const lastStatsCommandFields = statsCommandRuntimeFields[statsCommandRuntimeFields.length - 1];

    // if field name is not marked as a new field then we want ascertain it wasn't created by a preceding stats command
    if (!lastStatsCommandFields.has(pathSegment)) {
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

      fieldDeclarationCommandSummary = groupDeclarationCommandSummary
        ? {
            ...groupDeclarationCommandSummary,
            index: groupDeclarationCommandIndex,
          }
        : fieldDeclarationCommandSummary;
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

    const groupValueDefinition = getFieldDefinitionFromArg(groupValue.arg);
    if (isColumn(groupValueDefinition)) {
      return handleStatsByColumnLeafOperation(
        EditorESQLQuery,
        operatingStatsCommandIndex,
        groupValue,
        dataView.fields,
        esqlVariables,
        nodePathMap[pathSegment]
      );
    } else if (isFunctionExpression(groupValueDefinition)) {
      switch (groupValueDefinition.name) {
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
            `The "${groupValueDefinition.name}" function is not supported for leaf node operations`
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
  columnNode: FieldSummary,
  dataViewFields: DataView['fields'],
  esqlVariables: ESQLControlVariable[] | undefined,
  operationValue: unknown
): AggregateQuery {
  // create a new query to populate with the cascade operation query
  const cascadeOperationQuery = EsqlQuery.fromSrc('');
  const columnDefinition = getFieldDefinitionFromArg(columnNode.arg);
  let operationColumnName = columnDefinition.name;

  let operationColumnNameParamValue;

  if (
    (operationColumnNameParamValue = getFieldParamDefinition(
      operationColumnName,
      getFieldTerminals(columnNode.arg),
      esqlVariables
    ))
  ) {
    if (typeof operationColumnNameParamValue === 'string') {
      // we expect the operation column name parameter value to be a string, so we check for that and update the operation column name to the param value if it is
      operationColumnName = operationColumnNameParamValue;
    }
  }

  const shouldUseMatchPhrase = requiresMatchPhrase(operationColumnName, dataViewFields);

  const commandsUpToOperatingStatsCommand = editorQuery.ast.commands.slice(
    0,
    operatingStatsCommandIndex + 1
  );

  // We traverse the query backwards
  // because it's necessary to know if the last command is a stats command and
  // if each preceding command is also a stats command
  for (let idx = commandsUpToOperatingStatsCommand.length - 1; idx >= 0; idx--) {
    const cmd = commandsUpToOperatingStatsCommand[idx];
    const precedingCommandIsStats = commandsUpToOperatingStatsCommand[idx + 1]?.name === 'stats';

    if (
      cmd.name === 'stats' &&
      (idx === commandsUpToOperatingStatsCommand.length - 1 || precedingCommandIsStats)
    ) {
      const hasAggregates = cmd.args.some(isFunctionExpression);

      if (hasAggregates && !shouldUseMatchPhrase) {
        // when we aren't using match phrase replace
        // replace occurrence of stats command with inline stats
        mutate.generic.commands.insert(
          cascadeOperationQuery.ast,
          synth.cmd(`INLINE ${BasicPrettyPrinter.print(cmd)}`, { withFormatting: false }),
          0
        );
      } else {
        // if the stats command does not have any aggregates, or will require a match phrase query,
        // then we omit the STATS command to simply apply the where command to the query
        continue;
      }
    } else {
      mutate.generic.commands.insert(cascadeOperationQuery.ast, cmd, 0);
    }
  }

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
  categorizeCommandNode: FieldSummary,
  esqlVariables: ESQLControlVariable[] | undefined,
  nodePathMap: Record<string, string>
): AggregateQuery {
  // create a new query to populate with the cascade operation query
  const cascadeOperationQuery = EsqlQuery.fromSrc('');

  // include all the existing commands right up until the operating stats command
  editorQuery.ast.commands.slice(0, operatingStatsCommandIndex).forEach((cmd, idx, arr) => {
    if (cmd.name === 'stats' || (idx === arr.length - 1 && cmd.name === 'sample')) {
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
  const categorizedFieldDefinition = getFieldDefinitionFromArg(categorizeCommandNode.arg);
  const categorizedField = (
    categorizedFieldDefinition as ESQLFunction<'variadic-call', 'categorize'>
  ).args[0];

  let categorizedFieldName: string;

  // We only support categorizing columns for now,
  // it gets more complex attempting to support categorizing functions
  // that specifies a function as its arguments
  // without INLINE STATS supporting the categorize function
  if (isColumn(categorizedField)) {
    categorizedFieldName = (categorizedField as ESQLColumn).name;

    let categorizedFieldNameParamValue;

    if (
      (categorizedFieldNameParamValue = getFieldParamDefinition(
        categorizedFieldName,
        getFieldTerminals(categorizeCommandNode.arg),
        esqlVariables
      ))
    ) {
      if (typeof categorizedFieldNameParamValue === 'string') {
        // we expect the categorized field name parameter value to be a string, so we check for that and update the categorized field name to the param value if it is
        categorizedFieldName = categorizedFieldNameParamValue;
      }
    }
  } else {
    throw new Error('Categorizing functions with function arguments are not supported');
  }

  const matchValue = nodePathMap[removeBackticks(categorizeCommandNode.field)];

  // build a where command with match expressions for the selected categorize function
  const categorizeWhereCommand = Builder.command({
    name: 'where',
    args: [
      Builder.expression.func.call('match', [
        // this search doesn't work well on the keyword field when used with the match function, so we remove the keyword suffix to get the actual field name
        Builder.identifier({
          name: categorizedFieldName.replace(/\.keyword\b/i, ''),
        }),
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

  // This is the STATS command driving the cascade experience for the query provided
  const operatingStatsCommand = getStatsCommandToOperateOn(ESQLQuery)!;
  const statsCommandRuntimeFields = getStatsCommandRuntimeFields(ESQLQuery);
  const lastStatsCommandFields = statsCommandRuntimeFields[statsCommandRuntimeFields.length - 1];

  // when the grouping option is an unnamed function,
  // it's wrapped in backticks in the generated AST so we test for that first, else we assume this does not apply
  const rawFieldName = operatingStatsCommand.grouping[`\`${fieldName}\``]
    ? `\`${fieldName}\``
    : fieldName;

  const normalizedRawFieldName = removeBackticks(rawFieldName).replace(/\s+/g, '');

  // This is a placeholder for the normalized field name returned by the parser,
  // and in the case where we received a field name that maps to a variable,
  // it's value will be the field's variable value
  let normalizedFieldName = rawFieldName;

  // placeholder for the insertion anchor command which is the command that is most suited to accept the user's requested filtering operation
  let insertionAnchorCommand: ESQLCommand;

  // placeholder to indicate if the filtering target field points to a runtime field in the query
  // Check both with/without backticks and with whitespace normalization
  let filterTargetIsRuntimeField = Array.from(lastStatsCommandFields).some(
    (field) => field === normalizedRawFieldName
  );

  // placeholder for the computed expression of the filter operation that has been requested by the user
  let computedFilteringExpression: ESQLAstItem;

  const isFieldUsedInOperatingStatsCommand = Boolean(operatingStatsCommand.grouping[rawFieldName]);

  if (isFieldUsedInOperatingStatsCommand) {
    // check all the used fields of the operating stats command,
    // if any of the used fields are found in the stats runtime fields,
    // we attempt to get it's index because we'd want to place our filtering operation
    // before the command that declared the field used in the operating stats command.
    // This approach would always return the index of the earliest
    // stats command that's referenced in the operating stats command

    // Collect all used fields from both aggregates and grouping in the operating stats
    const allUsedFieldsInOperatingStats = new Set<string>();

    // Add used fields from aggregates
    Object.values(operatingStatsCommand.aggregates).forEach((aggregate) => {
      const usedFields = getUsedFields(aggregate.arg);
      usedFields.forEach((field) => allUsedFieldsInOperatingStats.add(field));
    });

    // Add used fields from grouping
    Object.values(operatingStatsCommand.grouping).forEach((group) => {
      const usedFields = getUsedFields(group.arg);
      usedFields.forEach((field) => allUsedFieldsInOperatingStats.add(field));
    });

    // Find the earliest stats command that created any of the fields used by the operating stats
    const operatingStatsCommandUsedFieldIndex = statsCommandRuntimeFields.findIndex((field) => {
      return [...allUsedFieldsInOperatingStats].some((usedField) => field.has(usedField));
    });

    // We make an initial assumption that the filtering operation's target field
    // was declared by the stats command driving the cascade experience
    let fieldDeclarationCommandSummary = operatingStatsCommand;

    // if the field name is not marked as a new field
    // then we know it was declared by the stats command driving the cascade experience
    const hasNormalizedField = Array.from(lastStatsCommandFields).some(
      (field) => field === normalizedRawFieldName
    );

    if (!hasNormalizedField) {
      // attempt to find the index of the stats command that declared the field
      const groupDeclarationCommandIndex = statsCommandRuntimeFields.findIndex((field) =>
        field.has(normalizedRawFieldName)
      );

      if (
        groupDeclarationCommandIndex >= 0 &&
        fieldDeclarationCommandSummary.index !== groupDeclarationCommandIndex
      ) {
        filterTargetIsRuntimeField = true;
        // update the field declaration command summary to the stats command
        // that declared the field the filtering operation is targeting
        fieldDeclarationCommandSummary = {
          ...getStatsCommandAtIndexSummary(ESQLQuery, groupDeclarationCommandIndex)!,
          index: groupDeclarationCommandIndex,
        };
      }
    }

    if (
      operatingStatsCommandUsedFieldIndex >= 0 &&
      operatingStatsCommandUsedFieldIndex !== operatingStatsCommand.index
    ) {
      insertionAnchorCommand = getStatsCommandAtIndexSummary(
        ESQLQuery,
        operatingStatsCommandUsedFieldIndex
      )!.command;

      // When we move the insertion anchor to an earlier stats command,
      // we need to check if the filter target field is a runtime field relative to that command
      // If it's not in the runtime fields up to this point, then it's a data source field
      // and we should treat it as not being a runtime field
      const runtimeFieldsUpToAnchor = statsCommandRuntimeFields.slice(
        0,
        operatingStatsCommandUsedFieldIndex + 1
      );
      const isRuntimeFieldAtAnchor = runtimeFieldsUpToAnchor.some((fields) =>
        Array.from(fields).some((field) => field === normalizedRawFieldName)
      );

      // If the field is not a runtime field at the anchor point, we should insert before the anchor
      if (!isRuntimeFieldAtAnchor) {
        filterTargetIsRuntimeField = false;
      }
    } else {
      // we default to the field declaration command summary as the insertion anchor command
      insertionAnchorCommand = fieldDeclarationCommandSummary.command;
    }

    let fieldNameParamValue;

    const fieldDeclaration = fieldDeclarationCommandSummary.grouping[rawFieldName];

    if (
      (fieldNameParamValue = getFieldParamDefinition(
        fieldName,
        getFieldTerminals(fieldDeclaration.arg),
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
          ? fieldDeclaration.arg.text
          : fieldDeclaration.field;
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
  // when its a runtime field or not used in the operating stats command,
  // we need to insert the new filtering "where" command right after the insertion anchor command
  // otherwise we insert it right before the insertion anchor command
  const commandsFollowingInsertionAnchor =
    !isFieldUsedInOperatingStatsCommand || filterTargetIsRuntimeField
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
      !isFieldUsedInOperatingStatsCommand || filterTargetIsRuntimeField
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
