/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, within, Parser } from '@elastic/esql';

interface DocumentHighlightItem {
  start: number;
  end: number;
}

/**
 * Returns all occurrences of the field (column) at the given offset in the query.
 * If the cursor is not on a column node, returns an empty array.
 */
export function getDocumentHighlightItems(
  fullText: string,
  offset: number
): DocumentHighlightItem[] {
  const { root } = Parser.parse(fullText);

  // Single walk: find the target column at cursor and collect all columns grouped by name
  let targetName: string | undefined;
  const columnsByName = new Map<string, DocumentHighlightItem[]>();

  Walker.walk(root, {
    visitColumn: (node) => {
      if (!targetName && within(offset, node)) {
        targetName = node.name;
      }

      const items = columnsByName.get(node.name);
      const highlight = { start: node.location.min, end: node.location.max };
      if (items) {
        items.push(highlight);
      } else {
        columnsByName.set(node.name, [highlight]);
      }
    },
  });

  return targetName ? columnsByName.get(targetName) ?? [] : [];
}
