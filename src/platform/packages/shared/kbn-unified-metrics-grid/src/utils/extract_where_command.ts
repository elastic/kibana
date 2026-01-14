/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLCommand } from '@kbn/esql-language';
import { BasicPrettyPrinter, isProperNode, Parser } from '@kbn/esql-language';

export const extractWhereCommand = (srcQuery?: Query | AggregateQuery): string[] => {
  if (!srcQuery || !isOfAggregateQueryType(srcQuery)) {
    return [];
  }

  const { root } = Parser.parse(srcQuery.esql);
  const whereConditions = root.commands.filter(
    (command): command is ESQLCommand => command.type === 'command' && command.name === 'where'
  );

  const extractExpression = (node: unknown) => {
    if (Array.isArray(node)) {
      const firstProperNode = node.find(isProperNode);
      return firstProperNode ? BasicPrettyPrinter.print(firstProperNode) : undefined;
    }
    return isProperNode(node) ? BasicPrettyPrinter.print(node) : undefined;
  };

  return whereConditions
    .map((cmd) => extractExpression(cmd.args[0]))
    .filter((expression): expression is string => Boolean(expression?.length));
};
