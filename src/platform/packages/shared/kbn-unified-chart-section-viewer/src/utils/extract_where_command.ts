/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@kbn/esql-language';
import { BasicPrettyPrinter, isProperNode, Parser, Walker } from '@kbn/esql-language';

export const extractWhereCommand = (esqlQuery?: string): string[] => {
  if (!esqlQuery) {
    return [];
  }

  const { root, errors } = Parser.parse(esqlQuery);
  if (errors.length > 0) {
    return [];
  }

  const whereConditions = Walker.matchAll(root, {
    type: 'command',
    name: 'where',
  }) as ESQLCommand[];

  const serializeWhereExpression = (node: unknown) => {
    if (Array.isArray(node)) {
      const firstProperNode = node.find(isProperNode);
      return firstProperNode ? BasicPrettyPrinter.print(firstProperNode) : undefined;
    }
    return isProperNode(node) ? BasicPrettyPrinter.print(node) : undefined;
  };

  return whereConditions
    .map((cmd) => serializeWhereExpression(cmd.args[0]))
    .filter((expression): expression is string => Boolean(expression?.length));
};
