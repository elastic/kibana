/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@kbn/esql-ast';
import {
  isESQLAstBaseItem,
  isESQLFunction,
  type ESQLColumn,
  type ESQLCommandOption,
} from '@kbn/esql-ast/src/types';

const isESQLCommandOption = (node: unknown): node is ESQLCommandOption =>
  isESQLAstBaseItem(node) && (node as ESQLCommandOption).type === 'option';

export interface AppliedStatsFunction {
  identifier: string;
  operator: string;
}

export const getESQLStatsQueryMeta = (queryString: string) => {
  const groupByFields: string[] = [];
  const appliedFunctions: AppliedStatsFunction[] = [];

  const parser = new Parser(queryString, { withFormatting: false });

  const statsNode = parser.parse().root.commands.find((command) => command.name === 'stats');

  if (!statsNode) {
    return { groupByFields, appliedFunctions };
  }

  statsNode.args.forEach((statsArgNode) => {
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
        }
      });
    }
  });

  return { groupByFields, appliedFunctions };
};
