/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Scalar } from 'yaml';
import { isMap, isScalar, LineCounter, parseDocument } from 'yaml';
import { getPathAtOffset } from '@kbn/workflows/common/utils/yaml';
import {
  buildWorkflowLookup,
  type WorkflowLookup,
} from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

/**
 * ES|QL step regions for validation and autocomplete share scalar extraction here.
 * Validation uses {@link collectEsqlRegionsFromLookup} (debounced store AST); autocomplete
 * uses {@link findEsqlRegionContainingCursor} (fresh parse of editor text each keystroke).
 */

export const ESQL_QUERY_STEP_TYPE = 'elasticsearch.esql.query' as const;

export type EsqlScalarStyle =
  | 'BLOCK_LITERAL'
  | 'BLOCK_FOLDED'
  | 'QUOTE_DOUBLE'
  | 'QUOTE_SINGLE'
  | 'PLAIN';

export interface EsqlStepRegion {
  /** Raw ES|QL substring sliced from the source — preserves indent / quotes. */
  esql: string;
  /** Inclusive offset in the source where `esql` begins. */
  contentStartInFile: number;
  /** Exclusive offset in the source where `esql` ends. */
  contentEndInFile: number;
  /** YAML scalar style used by the author. */
  scalarStyle: EsqlScalarStyle;
}

/**
 * Collects one `EsqlStepRegion` per `elasticsearch.esql.query` step from the
 * store-built workflow lookup (same source as other YAML validators).
 */
export function collectEsqlRegionsFromLookup(
  workflowLookup: WorkflowLookup,
  modelText: string
): EsqlStepRegion[] {
  const out: EsqlStepRegion[] = [];
  for (const step of Object.values(workflowLookup.steps)) {
    if (step.stepType === ESQL_QUERY_STEP_TYPE) {
      const queryProp = step.propInfos['with.query'];
      if (queryProp?.valueNode) {
        const region = extractEsqlRegionFromScalar(queryProp.valueNode, modelText);
        if (region && region.esql.trim().length > 0) {
          out.push(region);
        }
      }
    }
  }
  return out;
}

/**
 * Walks the YAML document and returns one `EsqlStepRegion` per
 * `elasticsearch.esql.query` step found. Regions are returned in document
 * order. Steps without a `with.query` value (e.g. the user just typed
 * `query:` without a body yet) are skipped.
 */
export function findEsqlStepRegions(modelText: string): EsqlStepRegion[] {
  // Prefer the lookup-based extraction (same as validators) to avoid walking every map node.
  const lineCounter = new LineCounter();
  const document = parseDocument(modelText, { lineCounter, keepSourceTokens: true });

  if (!document?.contents) {
    return [];
  }

  const workflowLookup = buildWorkflowLookup(document, lineCounter);
  return collectEsqlRegionsFromLookup(workflowLookup, modelText);
}

/** Convenience: parse + find in one call. Swallows parse errors. */
export function findEsqlStepRegionsFromText(modelText: string): EsqlStepRegion[] {
  try {
    return findEsqlStepRegions(modelText);
  } catch {
    return [];
  }
}

/**
 * Returns the `elasticsearch.esql.query` step region containing the cursor,
 * or `null` if the cursor is outside any.
 *
 * Parses `modelText` once, then tries path + scalar extraction (fast path)
 * before scanning every ES|QL step in the document.
 */
export function findEsqlRegionContainingCursor(
  modelText: string,
  absoluteOffset: number,
  pathHint?: Array<string | number>
): EsqlStepRegion | null {
  if (!modelText.includes(ESQL_QUERY_STEP_TYPE)) {
    return null;
  }

  const lineCounter = new LineCounter();
  let document: Document;
  try {
    document = parseDocument(modelText, { lineCounter, keepSourceTokens: true });
  } catch {
    return null;
  }

  if (pathHint && pathHint.length > 0) {
    const fromHint = tryEsqlRegionFromPath(document, pathHint, modelText, absoluteOffset);
    if (fromHint !== null) {
      return fromHint;
    }
  }

  try {
    const path = getPathAtOffset(document, absoluteOffset);
    const fromPath = tryEsqlRegionFromPath(document, path, modelText, absoluteOffset);
    if (fromPath !== null) {
      return fromPath;
    }
  } catch {
    // Path resolution can fail on partial YAML; fall through to the scan.
  }

  const workflowLookup = buildWorkflowLookup(document, lineCounter);
  for (const region of collectEsqlRegionsFromLookup(workflowLookup, modelText)) {
    if (isOffsetInEsqlQueryRegion(absoluteOffset, region, modelText)) {
      return region;
    }
  }
  return null;
}

/**
 * `extractEsqlRegionFromScalar` trims trailing whitespace off `contentEndInFile` so
 * validation diagnostics never point at hanging spaces. Completion needs the
 * opposite: when the user is typing past the last non-whitespace character of
 * the query body (e.g. `FROM logs-* | <cursor>`), the cursor is one or more
 * spaces past `contentEndInFile` but still inside the editable scalar. Treat
 * those positions as in-region as long as everything between `contentEndInFile`
 * and the cursor is intra-line whitespace (space or tab).
 */
export function isOffsetInEsqlQueryRegion(
  absoluteOffset: number,
  region: EsqlStepRegion,
  modelText: string
): boolean {
  if (absoluteOffset < region.contentStartInFile) {
    return false;
  }
  if (absoluteOffset <= region.contentEndInFile) {
    return true;
  }
  for (let i = region.contentEndInFile; i < absoluteOffset; i++) {
    const ch = modelText.charCodeAt(i);
    // 0x20 space, 0x09 tab. A newline closes the scalar's last line, so we stop.
    if (ch !== 0x20 && ch !== 0x09) {
      return false;
    }
  }
  return true;
}

/**
 * Maps a `with.query` YAML scalar to the ES|QL substring and file offsets used
 * for validation markers and autocomplete.
 */
export function extractEsqlRegionFromScalar(
  valueNode: Scalar,
  modelText: string
): EsqlStepRegion | null {
  if (!isScalar(valueNode) || !valueNode.range) {
    return null;
  }
  const [r0, , r2] = valueNode.range;
  if (r0 < 0 || r2 < r0 || r2 > modelText.length) {
    return null;
  }
  const sourceSlice = modelText.slice(r0, r2);
  const style = scalarTypeToStyle(valueNode.type);

  if (style === 'BLOCK_LITERAL' || style === 'BLOCK_FOLDED') {
    const newlineIdx = sourceSlice.indexOf('\n');
    if (newlineIdx === -1) {
      return null;
    }
    const contentStart = r0 + newlineIdx + 1;
    const trailingWs = sourceSlice.length - sourceSlice.trimEnd().length;
    const contentEnd = Math.max(contentStart, r2 - trailingWs);
    return {
      esql: modelText.slice(contentStart, contentEnd),
      contentStartInFile: contentStart,
      contentEndInFile: contentEnd,
      scalarStyle: style,
    };
  }

  if (style === 'QUOTE_DOUBLE' || style === 'QUOTE_SINGLE') {
    const quote = style === 'QUOTE_DOUBLE' ? '"' : "'";
    const firstQuote = sourceSlice.indexOf(quote);
    const lastQuote = sourceSlice.lastIndexOf(quote);
    if (firstQuote === -1 || lastQuote <= firstQuote) {
      return null;
    }
    const contentStart = r0 + firstQuote + 1;
    const contentEnd = r0 + lastQuote;
    return {
      esql: modelText.slice(contentStart, contentEnd),
      contentStartInFile: contentStart,
      contentEndInFile: contentEnd,
      scalarStyle: style,
    };
  }

  const leading = sourceSlice.length - sourceSlice.trimStart().length;
  const trailing = sourceSlice.length - sourceSlice.trimEnd().length;
  const contentStart = r0 + leading;
  const contentEnd = Math.max(contentStart, r2 - trailing);
  return {
    esql: modelText.slice(contentStart, contentEnd),
    contentStartInFile: contentStart,
    contentEndInFile: contentEnd,
    scalarStyle: 'PLAIN',
  };
}

function tryEsqlRegionFromPath(
  document: Document,
  path: (string | number)[],
  modelText: string,
  absoluteOffset: number
): EsqlStepRegion | null {
  if (path.length < 2) {
    return null;
  }
  const queryKey = path[path.length - 1];
  const withKey = path[path.length - 2];
  if (queryKey !== 'query' || withKey !== 'with') {
    return null;
  }

  const stepPath = path.slice(0, -2);
  const stepNode = document.getIn(stepPath, true);
  if (!isMap(stepNode) || stepNode.get('type') !== ESQL_QUERY_STEP_TYPE) {
    return null;
  }

  const queryNode = document.getIn(path, true);
  if (!isScalar(queryNode)) {
    return null;
  }

  const region = extractEsqlRegionFromScalar(queryNode, modelText);
  if (region === null || !isOffsetInEsqlQueryRegion(absoluteOffset, region, modelText)) {
    return null;
  }
  return region;
}

function scalarTypeToStyle(type: Scalar['type']): EsqlScalarStyle {
  switch (type) {
    case 'BLOCK_LITERAL':
      return 'BLOCK_LITERAL';
    case 'BLOCK_FOLDED':
      return 'BLOCK_FOLDED';
    case 'QUOTE_DOUBLE':
      return 'QUOTE_DOUBLE';
    case 'QUOTE_SINGLE':
      return 'QUOTE_SINGLE';
    default:
      return 'PLAIN';
  }
}
