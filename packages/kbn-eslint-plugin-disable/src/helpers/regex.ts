/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AST } from 'eslint';

const ESLINT_DISABLE_RE = /^eslint-disable(?:-next-line|-line)?(?<rulesBlock>.*)/;

export enum ESLINT_DISABLE_VALUE {
  DISABLE = 'eslint-disable',
  DISABLE_NEXT_LINE = 'eslint-disable-next-line',
  DISABLE_LINE = 'eslint-disable-line',
}

export interface ParsedEslintDisableComment {
  type: AST.Program['comments'][0]['type'];
  range: AST.Program['comments'][0]['range'];
  loc: AST.Program['comments'][0]['loc'];
  value: AST.Program['comments'][0]['value'];
  disableValueType: ESLINT_DISABLE_VALUE;
  rules: string[];
}

export function parseEslintDisableComment(
  comment: AST.Program['comments'][0]
): ParsedEslintDisableComment | undefined {
  const commentVal = comment.value.trim();
  const nakedESLintRegexResult = commentVal.match(ESLINT_DISABLE_RE);
  const rulesBlock = nakedESLintRegexResult?.groups?.rulesBlock;

  // no regex match
  if (!nakedESLintRegexResult) {
    return;
  }

  const disableValueType = commentVal.includes(ESLINT_DISABLE_VALUE.DISABLE_NEXT_LINE)
    ? ESLINT_DISABLE_VALUE.DISABLE_NEXT_LINE
    : commentVal.includes(ESLINT_DISABLE_VALUE.DISABLE_LINE)
    ? ESLINT_DISABLE_VALUE.DISABLE_LINE
    : ESLINT_DISABLE_VALUE.DISABLE;

  const rules = rulesBlock
    ? rulesBlock
        .trim()
        .split(',')
        .map((r) => r.trim())
    : [];

  return {
    type: comment.type,
    range: comment.range,
    loc: comment.loc,
    value: comment.value,
    disableValueType,
    rules,
  };
}
