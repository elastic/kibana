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
import { getPathAtOffset } from '../../../../common/lib/yaml';
import type { VariableItem } from '../model/types';

type Range = [start: number, end: number];

const contentRangeCache = new WeakMap<Document, Range[]>();

/**
 * Builds a sorted list of offset ranges that cover YAML scalar values.
 * Offsets that fall outside every range are inside comments, structural
 * whitespace, or collection tokens -- none of which contain variables.
 *
 * Uses `range[1]` (value-end) rather than `range[2]` (node-end) so
 * that trailing inline comments are excluded.
 */
function getScalarRanges(document: Document): Range[] {
  const cached = contentRangeCache.get(document);
  if (cached) return cached;

  const ranges: Range[] = [];

  visit(document, {
    Scalar(_k, node) {
      if (node.range) ranges.push([node.range[0], node.range[1]]);
    },
  });

  ranges.sort((a, b) => a[0] - b[0]);
  contentRangeCache.set(document, ranges);
  return ranges;
}

/*
  Use binary search to find if the offset is in the YAML content.
*/
function isOffsetInYamlContent(ranges: Range[], offset: number): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const [start, end] = ranges[mid];
    if (offset < start) hi = mid - 1;
    else if (offset >= end) lo = mid + 1;
    else return true;
  }
  return false;
}

export function collectAllVariables(
  model: monaco.editor.ITextModel,
  yamlDocument: Document,
  workflowGraph: WorkflowGraph
): VariableItem[] {
  const yamlString = model.getValue();
  const contentRanges = getScalarRanges(yamlDocument);
  const variableItems: VariableItem[] = [];
  for (const match of yamlString.matchAll(VARIABLE_REGEX_GLOBAL)) {
    const startOffset = match.index ?? 0;
    if (isOffsetInYamlContent(contentRanges, startOffset)) {
      const endOffset = startOffset + (match[0].length ?? 0);
      const startPosition = model.getPositionAt(startOffset);
      const endPosition = model.getPositionAt(endOffset);
      const yamlPath = getPathAtOffset(yamlDocument, startOffset);
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
