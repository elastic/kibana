/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery } from '@kbn/es-query';
import { extractCategorizeTokens } from '@kbn/esql-utils';
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
} from '@kbn/esql-ast';
import type {
  StatsCommandSummary,
  StatsFieldSummary,
} from '@kbn/esql-ast/src/mutate/commands/stats';

type NodeType = 'group' | 'leaf';

type StatsCommand = ESQLCommand<'stats'>;

export interface AppliedStatsFunction {
  identifier: string;
  operator: string;
}

const supportedStatsFunctions = new Set(['categorize']);

// helper for removing backticks from field names of function names
const removeBackticks = (str: string) => str.replace(/`/g, '');

export interface ESQLStatsQueryMeta {
  groupByFields: Array<{ field: string; type: string }>;
  appliedFunctions: AppliedStatsFunction[];
}

function getStatsCommandToOperateOn(esqlQuery: EsqlQuery): StatsCommandSummary | null {
  let summarizedStatsCommand: StatsCommandSummary | null = null;

  const statsCommands = Array.from(mutate.commands.stats.list(esqlQuery.ast));

  if (statsCommands.length === 0) {
    return summarizedStatsCommand;
  }

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

export const getESQLStatsQueryMeta = (queryString: string): ESQLStatsQueryMeta => {
  const groupByFields: ESQLStatsQueryMeta['groupByFields'] = [];
  const appliedFunctions: ESQLStatsQueryMeta['appliedFunctions'] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  const summarizedStatsCommand = getStatsCommandToOperateOn(esqlQuery);

  if (!summarizedStatsCommand) {
    return { groupByFields, appliedFunctions };
  }

  const grouping = Object.values(summarizedStatsCommand.grouping);

  for (let j = 0; j < grouping.length; j++) {
    const group = grouping[j];

    const groupFieldName = removeBackticks(group.field);

    const whereCommandGroupFieldSearch = mutate.commands.where.byField(
      esqlQuery.ast,
      Builder.expression.column({
        args: [Builder.identifier({ name: groupFieldName })],
      })
    );

    if (!group.definition || whereCommandGroupFieldSearch?.length) {
      // if query received is malformed without complete grouping definition or
      // there is a where command targeting a column on the stats command we are processing in the query,
      // then we do not want to classify it as having metadata required for the cascade experience
      return { groupByFields: [], appliedFunctions: [] };
    }

    if (isFunctionExpression(group.definition)) {
      const functionName = group.definition.name;
      if (!supportedStatsFunctions.has(functionName)) {
        continue;
      }
    }

    groupByFields.push({
      field: groupFieldName,
      type: group.definition.type === 'function' ? group.definition.name : group.definition.type,
    });
  }

  Object.values(summarizedStatsCommand.aggregates).forEach((aggregate) => {
    appliedFunctions.push({
      identifier: removeBackticks(aggregate.field), // we remove backticks to have a clean identifier that gets displayed in the UI
      operator: (aggregate.definition as ESQLFunction).operator?.name ?? aggregate.definition.text,
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
}: // @ts-expect-error -- temporary stop gap to fix deployment
CascadeQueryArgs): AggregateQuery => {
  const EditorESQLQuery = EsqlQuery.fromSrc(query.esql);

  const dataSourceCommand = mutate.generic.commands.find(
    EditorESQLQuery.ast,
    (cmd) => cmd.name === 'from'
  ) as ESQLCommand<'from'> | undefined;

  if (!dataSourceCommand) {
    throw new Error('Query does not have a data source');
  }

  const summarizedStatsCommand = getStatsCommandToOperateOn(EditorESQLQuery);

  if (!summarizedStatsCommand) {
    throw new Error('Query does not have a valid stats command with grouping options');
  }

  if (nodeType === 'leaf') {
    const pathSegment = nodePath[nodePath.length - 1];

    const groupValue =
      summarizedStatsCommand.grouping[pathSegment] ??
      // when a column name is not assigned, one is created automatically that includes backticks
      summarizedStatsCommand.grouping[`\`${pathSegment}\``];
    const isOperable = groupValue && nodePathMap[pathSegment];

    if (isOperable && isColumn(groupValue.definition)) {
      return handleStatsByColumnLeafOperation(dataSourceCommand, {
        [pathSegment]: nodePathMap[pathSegment],
      });
    } else if (isOperable && isFunctionExpression(groupValue.definition)) {
      switch (groupValue.definition.name) {
        case 'categorize': {
          return handleStatsByCategorizeLeafOperation(dataSourceCommand, groupValue, nodePathMap);
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
  dataSourceCommand: ESQLCommand<'from'>,
  columnInterpolationRecord: Record<string, string>
) {
  // create new query which we will modify to contain the valid query for the cascade experience
  const cascadeOperationQuery = EsqlQuery.fromSrc('');

  // append data source to to new query
  mutate.generic.commands.append(cascadeOperationQuery.ast, dataSourceCommand);

  const newCommands = Object.entries(columnInterpolationRecord).map(([key, value]) => {
    return Builder.command({
      name: 'where',
      args: [
        Builder.expression.func.binary('==', [
          Builder.expression.column({
            args: [Builder.identifier({ name: key })],
          }),
          Builder.expression.literal.string(value),
        ]),
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
  dataSourceCommand: ESQLCommand<'from'>,
  categorizeCommand: StatsFieldSummary,
  nodePathMap: Record<string, string>
) {
  // create new query which we will modify to contain the valid query for the cascade experience
  const cascadeOperationQuery = EsqlQuery.fromSrc('');

  // append data source to to new query
  mutate.generic.commands.append(cascadeOperationQuery.ast, dataSourceCommand);

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

        return Builder.expression.func.call('match', [
          Builder.identifier({ name: (arg as ESQLColumn).text }),
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
export function mutateQueryStatsGrouping(query: AggregateQuery, pick: string[]) {
  const EditorESQLQuery = EsqlQuery.fromSrc(query.esql);

  const dataSourceCommand = mutate.generic.commands.find(
    EditorESQLQuery.ast,
    (cmd) => cmd.name === 'from'
  ) as ESQLCommand<'from'> | undefined;

  if (!dataSourceCommand) {
    throw new Error('Query does not have a data source');
  }

  const statsCommands = Array.from(mutate.commands.stats.list(EditorESQLQuery.ast));

  if (statsCommands.length === 0) {
    throw new Error(`Query does not include a "stats" command`);
  }

  let statsCommandToOperateOn: StatsCommand | null = null;
  let statsCommandToOperateOnGrouping: StatsCommandSummary['grouping'] | null = null;

  // accounting for the possibility of multiple stats commands in the query,
  // we always want to operate on the last stats command that has valid grouping options
  for (let i = statsCommands.length - 1; i >= 0; i--) {
    ({ grouping: statsCommandToOperateOnGrouping } = mutate.commands.stats.summarizeCommand(
      EditorESQLQuery,
      statsCommands[i]
    ));

    if (statsCommandToOperateOnGrouping && Object.keys(statsCommandToOperateOnGrouping).length) {
      statsCommandToOperateOn = statsCommands[i] as StatsCommand;
      break;
    }
  }

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
            }
            return acc;
          }, []),
        });
      }

      // leverage synth to clone the rest of the args since we want to use as is
      return synth.exp((statsCommandArg as ESQLCommandOption).text, { withFormatting: false });
    }),
  });

  // Get the position of the original stats command
  const statsCommandIndex = EditorESQLQuery.ast.commands.findIndex(
    (cmd) => cmd === statsCommandToOperateOn
  );

  // remove stats command
  mutate.generic.commands.remove(EditorESQLQuery.ast, statsCommandToOperateOn);

  // insert modified stats command at same position previous one was at
  mutate.generic.commands.insert(EditorESQLQuery.ast, modifiedStatsCommand, statsCommandIndex);

  return {
    esql: BasicPrettyPrinter.print(EditorESQLQuery.ast),
  };
}
