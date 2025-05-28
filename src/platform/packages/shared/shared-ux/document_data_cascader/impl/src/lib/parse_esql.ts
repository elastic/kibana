/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';

export const getStatsGroupByColumnsFromQuery = (queryString: string) => {
  const groupByFields: string[] = [];
  const result = parse(queryString, { withFormatting: false });

  const statsNode = result.root.commands.find((command) => command.name === 'stats');

  if (!statsNode) {
    return groupByFields;
  }

  (
    statsNode.args.find((arg) => arg.type === 'option' && arg.name === 'by') ?? { args: [] }
  ).args?.forEach((byNode) => {
    if (byNode.type === 'column') {
      groupByFields.push(byNode.text);
    }
  });

  return groupByFields;
};
