/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, Walker } from '@kbn/esql-language';
import { useMemo } from 'react';
import { extractFilters } from '../utils/extract_filters';

export interface EsqlQueryInfo {
  metricField: string | undefined;
  columns: string[];
  indices: string[];
  dimensions: string[];
  filters: string[];
  metadataFields: string[];
}

export const useEsqlQueryInfo = ({ query }: { query: string }): EsqlQueryInfo => {
  return useMemo(() => {
    const ast = Parser.parse(query);
    const fieldsByCommand = new Map<string, string[]>();
    const indices = new Set<string>();
    const filters: string[] = extractFilters(query);
    const metadataFields = new Set<string>();

    // Extract stats fields
    const statsNodes = Walker.matchAll(ast.root, { type: 'command', name: 'stats' });
    Walker.walk(statsNodes, {
      visitColumn: (ctx, parent) => {
        const key = parent?.name === 'by' ? 'dimensions' : 'metricField';
        fieldsByCommand.set(key, [...(fieldsByCommand.get(key) ?? []), ctx.name]);
      },
    });

    // Extract indices
    const sourceNodes = Walker.matchAll(ast.root, { type: 'source' });
    Walker.walk(sourceNodes, {
      visitSource: (node) => {
        if (node.sourceType === 'index' && node.index?.value != null) {
          indices.add(node.index.value);
        }
      },
    });

    // Extract fields requested via FROM ... METADATA ...
    const metadataOptions = Walker.matchAll(ast.root, { type: 'option', name: 'metadata' });
    Walker.walk(metadataOptions, {
      visitColumn: (ctx) => {
        metadataFields.add(ctx.name);
      },
    });

    const metricFields = fieldsByCommand.get('metricField') ?? [];
    const dimensions = fieldsByCommand.get('dimensions') ?? [];

    return {
      metricField: metricFields[0],
      columns: metricFields,
      dimensions,
      indices: Array.from(indices),
      filters,
      metadataFields: Array.from(metadataFields),
    };
  }, [query]);
};
