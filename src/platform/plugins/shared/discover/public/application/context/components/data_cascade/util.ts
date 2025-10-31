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
  mutate,
  synth,
  type ESQLCommand,
  type ESQLFunction,
  type ESQLAstItem,
} from '@kbn/esql-ast';
import { isESQLFunction } from '@kbn/esql-ast/src/types';

type NodeType = 'group' | 'leaf';

type StatsCommand = ESQLCommand<'stats'>;

export interface AppliedStatsFunction {
  identifier: string;
  operator: string;
}

// helper for removing backticks from field names
const removeBackticks = (str: string) => str.replace(/`/g, '');

export interface ESQLStatsQueryMeta {
  groupByFields: Array<{ field: string; type: string }>;
  appliedFunctions: AppliedStatsFunction[];
}

export const getESQLStatsQueryMeta = (queryString: string): ESQLStatsQueryMeta => {
  const groupByFields: ESQLStatsQueryMeta['groupByFields'] = [];
  const appliedFunctions: ESQLStatsQueryMeta['appliedFunctions'] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  const statsCommands = Array.from(mutate.commands.stats.list(esqlQuery.ast));

  let statsCommand: StatsCommand | null = null;

  // TODO: when a where clause follows the stats command, it would not be regarded as a candidate for the cascade experience

  // we always want to operate on the last stats command that has valid grouping options,
  // but allow for the possibility of multiple stats commands in the query
  for (let i = statsCommands.length - 1; i >= 0; i--) {
    const { grouping } = mutate.commands.stats.summarizeCommand(esqlQuery, statsCommands[i]);

    if (grouping && Object.keys(grouping).length) {
      statsCommand = statsCommands[i] as StatsCommand;
      break;
    }
  }

  if (!statsCommand) {
    return { groupByFields, appliedFunctions };
  }

  const { grouping, aggregates } = mutate.commands.stats.summarizeCommand(esqlQuery, statsCommand);

  groupByFields.push(
    ...Object.values(grouping).map((group) => ({
      field: removeBackticks(group.field),
      type: group.definition.type === 'function' ? group.definition.name : group.definition.type,
    }))
  );

  Object.values(aggregates).forEach((aggregate) => {
    appliedFunctions.push({
      identifier: removeBackticks(aggregate.field),
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
}: CascadeQueryArgs): AggregateQuery => {
  const ESQLQuery = EsqlQuery.fromSrc(query.esql);

  const statsCommands = Array.from(mutate.commands.stats.list(ESQLQuery.ast));

  if (statsCommands.length === 0) {
    throw new Error(`Query does not include a "stats" command`);
  }

  let statsCommandToOperateOn: StatsCommand | null = null;

  // we always want to operate on the last stats command that has valid grouping options,
  // but allow for the possibility of multiple stats commands in the query
  for (let i = statsCommands.length - 1; i >= 0; i--) {
    const { grouping } = mutate.commands.stats.summarizeCommand(ESQLQuery, statsCommands[i]);

    if (grouping && Object.keys(grouping).length) {
      statsCommandToOperateOn = statsCommands[i] as StatsCommand;
      break;
    }
  }

  if (!statsCommandToOperateOn) {
    throw new Error(`No valid "stats" command was found in the query`);
  }

  let handled = false;
  let hasMultipleColumns: boolean;
  const { grouping } = mutate.commands.stats.summarizeCommand(ESQLQuery, statsCommandToOperateOn);

  Object.entries(grouping).forEach(([groupName, groupValue], _, groupingArr) => {
    if (isColumn(groupValue.definition) && nodePath.includes(groupName) && nodePathMap[groupName]) {
      switch (nodeType) {
        case 'leaf': {
          handleStatsByColumnLeafOperation(ESQLQuery, {
            [groupName]: nodePathMap[groupName],
          });
          handled = true;
          break;
        }
        case 'group': {
          if (
            groupingArr.length > 1 &&
            // it's not enough to check that we have multiple args for the stats by options
            (typeof hasMultipleColumns === 'undefined'
              ? (hasMultipleColumns =
                  groupingArr.filter((arg) => isColumn(arg[1].definition)).length > 1)
              : hasMultipleColumns)
          ) {
            handleStatsByColumnGroupOperation(ESQLQuery, statsCommandToOperateOn as StatsCommand, {
              [groupName]: nodePathMap[groupName],
            });
            handled = true;
          }
          break;
        }
        default: {
          // nothing to do for anything other than group or leaf nodes
          break;
        }
      }
    } else if (isESQLFunction(groupValue.definition)) {
      switch (groupValue.definition.name) {
        case 'categorize': {
          // TODO: handle categorize option
          break;
        }
        case 'bucket': {
          // TODO: handle bucket option
          break;
        }
        default: {
          // unsupported by function, nothing to do here
          break;
        }
      }
    }
  });

  if (handled) {
    // remove the stats command if it has been fully handled,
    // TODO: explore the possibility of scenarios where it might not be necessary to remove the command
    mutate.generic.commands.remove(ESQLQuery.ast, statsCommandToOperateOn);
  }

  // open question: should we remove the limit command as well, seems a little naive to assume it's always safe?
  const limitCommands = Array.from(mutate.commands.limit.list(ESQLQuery.ast));

  // ideally we only want to remove limit commands that are after the stats command we operated on,
  limitCommands.forEach((cmd) => {
    mutate.generic.commands.remove(ESQLQuery.ast, cmd);
  });

  return {
    esql: BasicPrettyPrinter.print(ESQLQuery.ast),
  };
};

/**
 * @description adds a where command with current value for a matched column option as a side-effect on the passed query,
 * helps us with fetching leaf node data for stats operation in the data cascade experience.
 */
function handleStatsByColumnLeafOperation(
  query: EsqlQuery,
  columnInterpolationRecord: Record<string, string>
) {
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

  newCommands.forEach((command, idx) => {
    mutate.generic.commands.insert(query.ast, command, 1 + idx);
  });
}

/**
 * Handles the stats command for a group operation that purely contained of column definitions by modifying the query and adding necessary commands.
 * @param query The ESQL query to modify.
 * @param statsCommand The original stats command to modify.
 * @param columnInterpolationRecord A record of column names and their interpolated values.
 */
function handleStatsByColumnGroupOperation(
  query: EsqlQuery,
  statsCommand: StatsCommand,
  columnInterpolationRecord: Record<string, string>
) {
  // Get the column names to exclude from the stats command
  const columnsToExclude = Object.keys(columnInterpolationRecord);

  // Create a modified stats command without the excluded columns as args
  const modifiedStatsCommand = Builder.command({
    name: 'stats',
    args: statsCommand.args.map((statsCommandArg) => {
      if (isOptionNode(statsCommandArg) && statsCommandArg.name === 'by') {
        return Builder.option({
          name: statsCommandArg.name,
          args: statsCommandArg.args.reduce<Array<ESQLAstItem>>((acc, cur) => {
            if (isColumn(cur) && !columnsToExclude.includes(cur.text)) {
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

      // @ts-expect-error -- hack to avoid building any other args that the stats command has since we don't need to modify them
      return synth.exp`${statsCommandArg?.text}`;
    }),
  });

  // Get the position of the original stats command
  const statsCommandIndex = query.ast.commands.findIndex((cmd) => cmd === statsCommand);

  // remove stats command
  mutate.generic.commands.remove(query.ast, statsCommand);

  // insert modified stats command at same position previous one was at
  mutate.generic.commands.insert(query.ast, modifiedStatsCommand, statsCommandIndex);

  // Add where command with current value
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

  newCommands.forEach((command, idx) => {
    mutate.generic.commands.insert(query.ast, command, 1 + idx);
  });
}

// function handleStatsByCategorizeLeafOperation(
//   query: EsqlQuery,
//   nodePathMap: Record<string, string>
// ) {
//   throw new Error('Not yet implemented!');
// }

// function handleStatsByCategorizeGroupOperation(
//   query: EsqlQuery,
//   nodePathMap: Record<string, string>
// ) {
//   throw new Error('Not yet implemented!');
// }
