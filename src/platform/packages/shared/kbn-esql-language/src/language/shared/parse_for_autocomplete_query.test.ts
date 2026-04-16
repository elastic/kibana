/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstItem, ESQLSingleAstItem } from '@elastic/esql/types';
import { isMarkerNode } from '../../commands/definitions/utils/ast';
import { getAutocompleteCursorContext } from './parse_for_autocomplete_query';

function assertNoMarker(
  node: ESQLSingleAstItem | ESQLAstAllCommands | undefined,
  query: string,
  label: string
) {
  if (!node) {
    return;
  }

  Walker.walk(node, {
    visitAny(current) {
      if (isMarkerNode(current as ESQLAstItem)) {
        throw new Error(`Marker node found in ${label} for query: ${query}`);
      }
    },
  });
}

describe('getAutocompleteCursorContext', () => {
  it('returns marker-free autocomplete context for incomplete expressions', () => {
    const queries = [
      'FROM employees | EVAL total = ',
      'ROW total = ',
      'FROM employees | EVAL total = ROUND(salary, ',
      'FROM employees | WHERE age IN (1, ',
    ];

    for (const query of queries) {
      const { astContext } = getAutocompleteCursorContext(query, query.length);

      if (astContext.type !== 'expression') {
        throw new Error(`Expected expression context for query: ${query}`);
      }

      assertNoMarker(astContext.command, query, 'command');
      assertNoMarker(astContext.node, query, 'node');
      assertNoMarker(astContext.option, query, 'option');
      assertNoMarker(astContext.containingFunction, query, 'containingFunction');
    }
  });
});
