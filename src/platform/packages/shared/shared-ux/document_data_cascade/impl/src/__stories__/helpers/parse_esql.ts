/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Parser,
  isOptionNode,
  isFunctionExpression,
  isColumn,
  type ESQLColumn,
} from '@kbn/esql-ast';

export interface AppliedStatsFunction {
  identifier: string;
  aggregation: string;
}

/**
 * Very simplistic ESQL parser to extract group by fields and applied stats functions from a stats query,
 * for demonstration purposes in storybook.
 */
export const getESQLStatsQueryMeta = (queryString: string) => {
  const groupByFields: string[] = [];
  const appliedFunctions: AppliedStatsFunction[] = [];

  const parser = new Parser(queryString, { withFormatting: false });

  const statsNode = parser.parse().root.commands.find((command) => command.name === 'stats');

  if (!statsNode) {
    return { groupByFields, appliedFunctions };
  }

  statsNode.args.forEach((statsArgNode) => {
    if (isFunctionExpression(statsArgNode)) {
      const appliedFunctionMeta: Partial<AppliedStatsFunction> = {};

      statsArgNode.args.forEach((argNode) => {
        if (isColumn(argNode)) {
          appliedFunctionMeta.identifier = (argNode as ESQLColumn).text;
        } else if (Array.isArray(argNode)) {
          argNode.forEach((node) => {
            if (isFunctionExpression(node)) {
              appliedFunctionMeta.aggregation = node.operator?.name;
            }
          });
        }

        if (Object.values(appliedFunctionMeta).length === 2) {
          appliedFunctions.push(appliedFunctionMeta as AppliedStatsFunction);
        }
      });
    } else if (isOptionNode(statsArgNode) && statsArgNode.name === 'by') {
      statsArgNode.args.forEach((byOptionNode) => {
        if (isColumn(byOptionNode)) {
          groupByFields.push(byOptionNode.text);
        }
      });
    }
  });

  return { groupByFields, appliedFunctions };
};
