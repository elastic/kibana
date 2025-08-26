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

export const getESQLStatsQueryMeta = (queryString: string) => {
  const groupByFields: Array<{ field: string; type: string }> = [];
  const appliedFunctions: AppliedStatsFunction[] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  Array.from(mutate.commands.stats.list(esqlQuery.ast)).forEach((statsCommand) => {
    const { grouping, aggregates } = mutate.commands.stats.summarizeCommand(
      esqlQuery,
      statsCommand
    );

    groupByFields.push(
      ...Object.values(grouping).map((group) => ({
        field: removeBackticks(group.field),
        type: group.definition.type === 'function' ? group.definition.name : group.definition.type,
      }))
    );

    Object.values(aggregates).forEach((aggregate) => {
      appliedFunctions.push({
        identifier: removeBackticks(aggregate.field),
        operator:
          (aggregate.definition as ESQLFunction).operator?.name ?? aggregate.definition.text,
      });
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

  // Attempt to handle every stats query present appropriately
  statsCommands.forEach((statsCommand) => {
    let handled = false;
    let hasMultipleColumns: boolean;
    const { grouping } = mutate.commands.stats.summarizeCommand(ESQLQuery, statsCommand);

    Object.entries(grouping).forEach(([groupName, groupValue], _, groupingArr) => {
      if (
        isColumn(groupValue.definition) &&
        nodePath.includes(groupName) &&
        nodePathMap[groupName]
      ) {
        if (nodeType === 'leaf') {
          handleStatsByColumnLeafOperation(ESQLQuery, {
            [groupName]: nodePathMap[groupName],
          });
          handled = true;
        } else if (
          nodeType === 'group' &&
          groupingArr.length > 1 &&
          // it's not enough to check that we have multiple args for the stats by options
          (typeof hasMultipleColumns === 'undefined'
            ? (hasMultipleColumns =
                groupingArr.filter((arg) => isColumn(arg[1].definition)).length > 1)
            : hasMultipleColumns)
        ) {
          handleStatsByColumnGroupOperation(ESQLQuery, statsCommand as StatsCommand, {
            [groupName]: nodePathMap[groupName],
          });
          handled = true;
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
      // explore the possibility of scenarios where it might not be necessary to remove the command
      mutate.generic.commands.remove(ESQLQuery.ast, statsCommand);
    }
  });

  // open question: should we remove the limit command as well, seems a little naive to assume it's always safe?
  const limitCommands = Array.from(mutate.commands.limit.list(ESQLQuery.ast));

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
