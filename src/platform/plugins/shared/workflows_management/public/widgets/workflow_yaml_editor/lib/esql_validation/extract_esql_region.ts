/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scalar } from 'yaml';
import { isScalar } from 'yaml';
import type { WorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

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
 * Maps a `with.query` YAML scalar to the ES|QL substring and file offsets used
 * for validation markers.
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
