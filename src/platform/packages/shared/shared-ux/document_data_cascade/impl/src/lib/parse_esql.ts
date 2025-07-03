/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@kbn/esql-ast';

export const getESQLStatsQueryMeta = (queryString: string) => {
  const groupByFields: string[] = [];
  interface AppliedStatsFunction {
    identifier: string;
    operator: string;
  }
  const appliedFunctions: AppliedStatsFunction[] = [];

  const parser = new Parser(queryString, { withFormatting: false });

  const statsNode = parser.parse().root.commands.find((command) => command.name === 'stats');

  if (!statsNode) {
    return { groupByFields, appliedFunctions };
  }

  statsNode.args.forEach((statsArgNode) => {
    if (statsArgNode.type === 'function') {
      const appliedFunctionMeta: AppliedStatsFunction = {};

      statsArgNode.args.forEach((argNode) => {
        if (
          Object.prototype.toString.call(argNode) === '[object Object]' &&
          argNode.type === 'column'
        ) {
          appliedFunctionMeta.identifier = argNode.text;
        } else if (Array.isArray(argNode)) {
          argNode.forEach((node) => {
            if (node.type === 'function') {
              appliedFunctionMeta.operator = node.operator?.name;
            }
          });
        }

        if (Object.values(appliedFunctionMeta).length === 2) {
          appliedFunctions.push(appliedFunctionMeta);
        }
      });
    } else if (statsArgNode.type === 'option' && statsArgNode.name === 'by') {
      statsArgNode.args.forEach((byOptionNode) => {
        if (byOptionNode.type === 'column') {
          groupByFields.push(byOptionNode.text);
        }
      });
    }
  });

  return { groupByFields, appliedFunctions };
};
