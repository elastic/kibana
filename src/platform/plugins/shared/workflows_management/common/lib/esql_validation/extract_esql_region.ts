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
import type { StepInfo, WorkflowLookup } from '@kbn/workflows-yaml';

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
  /**
   * The query YAML hands to the step, set only when the quoted source has
   * escapes (`\"` or `''`) that ES|QL would reject.
   */
  decodedEsql?: string;
}

/** The query text to validate: the decoded value when the source has escapes. */
export const getEsqlToValidate = ({ esql, decodedEsql }: EsqlStepRegion): string =>
  decodedEsql ?? esql;

/**
 * Maps a diagnostic range in the validated query to file offsets. Offsets in a
 * decoded query do not match the source, so the range covers the whole query.
 */
export const toFileRange = (
  { contentStartInFile, contentEndInFile, decodedEsql }: EsqlStepRegion,
  start: number,
  end: number
): { start: number; end: number } =>
  decodedEsql === undefined
    ? { start: contentStartInFile + start, end: contentStartInFile + end }
    : { start: contentStartInFile, end: contentEndInFile };

export interface EsqlStepLocation {
  step: StepInfo;
  region: EsqlStepRegion;
}

/**
 * Returns the `elasticsearch.esql.query` steps with a non-empty query, in
 * document order.
 */
export function collectEsqlStepsFromLookup(
  { steps }: WorkflowLookup,
  modelText: string
): EsqlStepLocation[] {
  const locations: EsqlStepLocation[] = [];
  for (const step of Object.values(steps)) {
    if (step.stepType === ESQL_QUERY_STEP_TYPE) {
      const valueNode = step.propInfos['with.query']?.valueNode;
      const region = valueNode ? extractEsqlRegionFromScalar(valueNode, modelText) : null;
      if (region && region.esql.trim().length > 0) {
        locations.push({ step, region });
      }
    }
  }
  return locations.sort((a, b) => a.region.contentStartInFile - b.region.contentStartInFile);
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
    const esql = modelText.slice(contentStart, contentEnd);
    const hasEscapes = esql.includes(style === 'QUOTE_DOUBLE' ? '\\' : "''");
    const decoded = valueNode.value;
    return {
      esql,
      contentStartInFile: contentStart,
      contentEndInFile: contentEnd,
      scalarStyle: style,
      ...(hasEscapes && typeof decoded === 'string' ? { decodedEsql: decoded } : {}),
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
