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
  mutate,
  type ESQLCommand,
  type ESQLColumn,
  type ESQLCommandOption,
} from '@kbn/esql-ast';
import { isESQLAstBaseItem, isESQLFunction } from '@kbn/esql-ast/src/types';

type NodeType = 'group' | 'leaf';

type StatsCommand = ESQLCommand<'stats'>;

const isESQLCommandOption = (node: unknown): node is ESQLCommandOption =>
  isESQLAstBaseItem(node) && (node as ESQLCommandOption).type === 'option';

export interface AppliedStatsFunction {
  identifier: string;
  operator: string;
}

export const getESQLStatsQueryMeta = (queryString: string) => {
  const groupByFields: string[] = [];
  const appliedFunctions: AppliedStatsFunction[] = [];

  const esqlQuery = EsqlQuery.fromSrc(queryString);

  Array.from(mutate.commands.stats.list(esqlQuery.ast)).forEach((statsCommand) => {
    (statsCommand as StatsCommand).args.forEach((statsArgNode) => {
      if (isESQLFunction(statsArgNode)) {
        const appliedFunctionMeta: Partial<AppliedStatsFunction> = {};

        statsArgNode.args.forEach((argNode) => {
          if (isColumn(argNode)) {
            appliedFunctionMeta.identifier = argNode.text;
          } else if (Array.isArray(argNode)) {
            argNode.forEach((node) => {
              if (isESQLFunction(node)) {
                appliedFunctionMeta.operator = node.operator?.name;
              }
            });
          }

          if (Object.values(appliedFunctionMeta).length === 2) {
            appliedFunctions.push(appliedFunctionMeta as AppliedStatsFunction);
          }
        });
      } else if (isESQLCommandOption(statsArgNode) && statsArgNode.name === 'by') {
        statsArgNode.args.forEach((byOptionNode) => {
          if (isColumn(byOptionNode)) {
            groupByFields.push(byOptionNode.text);
          } else if (isESQLFunction(byOptionNode)) {
            groupByFields.push(byOptionNode.text);
          }
        });
      }
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
    (statsCommand as StatsCommand).args.forEach((statsArgNode) => {
      if (isESQLCommandOption(statsArgNode) && statsArgNode.name === 'by') {
        let hasMultipleColumns: boolean;

        statsArgNode.args.forEach((byOptionArg, _, args) => {
          if (isColumn(byOptionArg) && nodePath.includes(byOptionArg.name)) {
            if (nodeType === 'leaf') {
              handleStatsByColumnLeafOperation(ESQLQuery, {
                [byOptionArg.name]: nodePathMap[byOptionArg.name],
              });
            } else if (
              nodeType === 'group' &&
              args.length > 1 &&
              // it's not enough to check that we have multiple args for the stats by options
              (typeof hasMultipleColumns === 'undefined'
                ? (hasMultipleColumns = args.filter((arg) => isColumn(arg)).length > 1)
                : hasMultipleColumns)
            ) {
              handleStatsByColumnGroupOperation(
                ESQLQuery,
                statsCommand as StatsCommand,
                byOptionArg,
                {
                  [byOptionArg.name]: nodePathMap[byOptionArg.name],
                }
              );
            }
          } else if (isESQLFunction(byOptionArg)) {
            switch (byOptionArg.name) {
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
      }
    });

    // Add check to only remove the stats command if it has been fully handled
    mutate.generic.commands.remove(ESQLQuery.ast, statsCommand);
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

function handleStatsByColumnGroupOperation(
  query: EsqlQuery,
  statsCommand: StatsCommand,
  byOptionArg: ESQLColumn,
  columnInterpolationRecord: Record<string, string>
) {
  // TODO: ideally we'd want to modify the passed stats command,
  // especially if for some reason it contains the column we want to group by
  // we should remove it from the stats command

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

function handleStatsByCategorizeLeafOperation(
  query: EsqlQuery,
  nodePathMap: Record<string, string>
) {
  throw new Error('Not yet implemented!');
}

function handleStatsByCategorizeGroupOperation(
  query: EsqlQuery,
  nodePathMap: Record<string, string>
) {
  throw new Error('Not yet implemented!');
}
