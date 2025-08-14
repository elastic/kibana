/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AggregateQuery } from '@kbn/es-query';
import { mutate, BasicPrettyPrinter, Builder, EsqlQuery } from '@kbn/esql-ast';
import {
  isESQLAstBaseItem,
  isESQLFunction,
  type ESQLColumn,
  type ESQLCommandOption,
} from '@kbn/esql-ast/src/types';

type SupportedOperations = 'stats' | 'categorize';
type NodeType = 'group' | 'leaf';

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
    statsCommand.args.forEach((statsArgNode) => {
      if (isESQLFunction(statsArgNode)) {
        const appliedFunctionMeta: Partial<AppliedStatsFunction> = {};

        statsArgNode.args.forEach((argNode) => {
          if (
            Object.prototype.toString.call(argNode) === '[object Object]' &&
            (argNode as ESQLColumn).type === 'column'
          ) {
            appliedFunctionMeta.identifier = (argNode as ESQLColumn).text;
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
          if ((byOptionNode as ESQLColumn).type === 'column') {
            groupByFields.push((byOptionNode as ESQLColumn).text);
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
  query: AggregateQuery;
  operation: SupportedOperations;
  nodeType: NodeType;
  nodePath: string[];
  nodePathMap: Record<string, string>;
}

export const constructCascadeQuery = ({
  query,
  operation,
  nodeType,
  nodePath,
  nodePathMap,
}: CascadeQueryArgs) => {
  const ESQLQuery = EsqlQuery.fromSrc(query.esql);

  const operationCheck = ESQLQuery.ast.commands.find((cmd) => cmd.name === operation);

  if (!operationCheck) {
    throw new Error(`Operation "${operation}" not found in query`);
  }

  switch (operation) {
    case 'stats': {
      return nodeType === 'leaf'
        ? handleLeafStatsOperation(ESQLQuery, nodePathMap)
        : handleGroupStatsOperation(ESQLQuery, nodePathMap);
    }

    case 'categorize': {
      // Handle categorize operation
      return handleCategorizeOperation(ESQLQuery, nodePathMap);
    }

    default: {
      throw new Error(`Unsupported operation: ${operation}`);
    }
  }
};

/**
 * @description Handles fetching leaf node data for stats operation in the data cascade experience
 */
function handleLeafStatsOperation(query: EsqlQuery, nodePathMap: Record<string, string>) {
  // extracts commands we'd like to remove from the query, if exist 'stats' and 'limit'
  const commandsToRemove = ['stats' as const, 'limit' as const].flatMap((operation) => {
    return Array.from(mutate.commands[operation].list(query.ast));
  });

  commandsToRemove.forEach((cmd) => {
    mutate.generic.commands.remove(query.ast, cmd);
  });

  // Add where command with current value
  const newCommands = Object.entries(nodePathMap).map(([key, value]) => {
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

  return BasicPrettyPrinter.print(query.ast);
}

function handleGroupStatsOperation(query: EsqlQuery, nodePathMap: Record<string, string>) {
  const commandsToRemove = ['limit' as const].flatMap((operation) => {
    return Array.from(mutate.commands[operation].list(query.ast));
  });

  commandsToRemove.forEach((cmd) => {
    mutate.generic.commands.remove(query.ast, cmd);
  });

  // Add where command with current value
  const newCommands = Object.entries(nodePathMap).map(([key, value]) => {
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

  return BasicPrettyPrinter.print(query.ast);
}

function handleCategorizeOperation(query: EsqlQuery, nodePathMap: Record<string, string>) {
  throw new Error('Not yet implemented!');
}
