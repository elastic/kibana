/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { visit } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { VariableItem } from '../model/types';

interface ScalarEntry {
  start: number;
  end: number;
  path: Array<string | number>;
}

const scalarIndexCache = new WeakMap<Document, ScalarEntry[]>();

/**
 * Builds a sorted index of every scalar in the document in a single `visit()`,
 * pre-computing both ranges and YAML paths.
 */
function getScalarIndex(document: Document): ScalarEntry[] {
  const cached = scalarIndexCache.get(document);
  if (cached) {
    return cached;
  }

  const entries: ScalarEntry[] = [];
  visit(document, {
    Scalar(_k, node, ancestors) {
      if (node.range && node.value !== '') {
        entries.push({
          start: node.range[0],
          end: node.range[1],
          path: getPathFromAncestors(ancestors, node),
        });
      }
    },
  });

  entries.sort((a, b) => a.start - b.start);
  scalarIndexCache.set(document, entries);
  return entries;
}

function findScalarAtOffset(entries: ScalarEntry[], offset: number): ScalarEntry | null {
  let lo = 0;
  let hi = entries.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const entry = entries[mid];
    if (offset < entry.start) {
      hi = mid - 1;
    } else if (offset >= entry.end) {
      lo = mid + 1;
    } else {
      return entry;
    }
  }
  return null;
}

export function collectAllVariables(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  workflowGraph: WorkflowGraph
): VariableItem[] {
  const yamlString = model.getValue();
  const scalarIndex = getScalarIndex(yamlDocument);
  const variableItems: VariableItem[] = [];

  for (const match of yamlString.matchAll(VARIABLE_REGEX_GLOBAL)) {
    const startOffset = match.index ?? 0;
    const entry = findScalarAtOffset(scalarIndex, startOffset);
    if (entry) {
      const endOffset = startOffset + (match[0].length ?? 0);
      const startPosition = model.getPositionAt(startOffset);
      const endPosition = model.getPositionAt(endOffset);
      const { path: yamlPath } = entry;
      const type =
        yamlPath.length > 1 && yamlPath[yamlPath.length - 1] === 'foreach' ? 'foreach' : 'regexp';
      variableItems.push({
        id: `${match.groups?.key ?? null}-${startPosition.lineNumber}-${startPosition.column}-${
          endPosition.lineNumber
        }-${endPosition.column}`,
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column,
        key: match.groups?.key ?? null,
        type,
        yamlPath,
        offset: startOffset,
      });
    }
  }

  return variableItems;
}
