/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Pair, Scalar, YAMLMap } from 'yaml';
import { isMap, isScalar, parseDocument, visit } from 'yaml';

const ESQL_QUERY_STEP_TYPE = 'elasticsearch.esql.query';

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
 * Walks the YAML document and returns one `EsqlStepRegion` per
 * `elasticsearch.esql.query` step found. Regions are returned in document
 * order. Steps without a `with.query` value (e.g. the user just typed
 * `query:` without a body yet) are skipped.
 *
 * Pass `parseDocument(modelText)` for a fresh AST; the function gracefully
 * handles partially invalid YAML by ignoring whatever it can't resolve.
 */
export function findEsqlStepRegions(
  document: Document | null | undefined,
  modelText: string
): EsqlStepRegion[] {
  if (!document?.contents) {
    return [];
  }
  const out: EsqlStepRegion[] = [];

  visit(document, {
    Map(_key, mapNode) {
      if (mapNode.get('type') !== ESQL_QUERY_STEP_TYPE) {
        return undefined;
      }
      const withNode = mapNode.get('with', true);
      if (!isMap(withNode)) {
        return undefined;
      }
      const queryPair = findQueryPair(withNode);
      if (!queryPair) {
        return undefined;
      }
      const region = extractRegion(queryPair, modelText);
      // Skip queries that don't yet have any text the validator could chew on —
      // an empty `query:` is a perfectly valid in-progress state, not an error.
      if (region && region.esql.trim().length > 0) {
        out.push(region);
      }
      return undefined;
    },
  });

  return out;
}

/** Convenience: parse + find in one call. Swallows parse errors. */
export function findEsqlStepRegionsFromText(modelText: string): EsqlStepRegion[] {
  try {
    return findEsqlStepRegions(parseDocument(modelText), modelText);
  } catch {
    return [];
  }
}

function findQueryPair(withNode: YAMLMap): Pair | undefined {
  for (const item of withNode.items) {
    if (isScalar(item.key) && item.key.value === 'query') {
      return item;
    }
  }
  return undefined;
}

function extractRegion(queryPair: Pair, modelText: string): EsqlStepRegion | null {
  const value = queryPair.value;
  if (!isScalar(value) || !value.range) {
    return null;
  }
  const [r0, , r2] = value.range;
  if (r0 < 0 || r2 < r0 || r2 > modelText.length) {
    return null;
  }
  const sourceSlice = modelText.slice(r0, r2);
  const style = scalarTypeToStyle(value.type);

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

  // PLAIN
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
