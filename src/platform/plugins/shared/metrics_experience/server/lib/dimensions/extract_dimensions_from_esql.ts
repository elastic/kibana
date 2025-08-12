/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, Walker } from '@kbn/esql-ast';

export function extractDimensionsFromESQL(esql: string) {
  const ast = Parser.parse(esql);
  const dimensions = new Set<string>();

  const statsNode = Walker.matchAll(ast.root, {
    type: 'command',
    name: 'stats',
  });

  Walker.walk(statsNode, {
    visitColumn: (ctx, parent) => {
      if (parent?.name === 'by') {
        dimensions.add(ctx.name);
      }
    },
  });

  return [...dimensions];
}
