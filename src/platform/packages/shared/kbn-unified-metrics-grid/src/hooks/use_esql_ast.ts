/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { Parser, Walker } from '@kbn/esql-ast';

export interface AstResults {
  metricField: string;
  columns: string[];
  indices: string[];
  dimensions: string[];
}

export const useEsqlAst = ({ esql }: { esql: string }) => {
  const fieldsByCommand = useMemo(() => {
    const ast = Parser.parse(esql);

    const fieldsByCommandMap = new Map<string, string[]>();
    const indices = new Set<string>();

    const statsNode = Walker.matchAll(ast.root, {
      type: 'command',
      name: 'stats',
    });

    Walker.walk(statsNode, {
      visitColumn: (ctx, parent) => {
        const key = parent?.name === 'by' ? 'dimensions' : 'metricField';
        fieldsByCommandMap.set(key, [...(fieldsByCommandMap.get(key) ?? []), ctx.name]);
      },
    });

    const sourceNode = Walker.matchAll(ast.root, {
      type: 'source',
    });

    Walker.walk(sourceNode, {
      visitSource: (node) => {
        if (node.sourceType === 'index' && node.index?.value != null) {
          indices.add(node.index.value);
        }
      },
    });

    return fieldsByCommandMap;
  }, [esql]);

  const indices = useMemo(() => {
    const ast = Parser.parse(esql);

    const indicesSet = new Set<string>();
    const sourceNode = Walker.matchAll(ast.root, {
      type: 'source',
    });

    Walker.walk(sourceNode, {
      visitSource: (node) => {
        if (node.sourceType === 'index' && node.index?.value != null) {
          indicesSet.add(node.index.value);
        }
      },
    });

    return indicesSet;
  }, [esql]);

  const results = {
    // Considering that the query will contain only one metric field - change if needed
    metricField: [...(fieldsByCommand.get('metricField') ?? [])][0],
    columns: [...(fieldsByCommand.get('metricField') ?? [])],
    dimensions: [...(fieldsByCommand.get('dimensions') ?? [])],
    indices: [...indices],
  };

  // TODO: Remove debug logging in production
  // eslint-disable-next-line no-console
  console.log(results);

  return results;
};
