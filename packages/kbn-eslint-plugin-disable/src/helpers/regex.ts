/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type Eslint from 'eslint';

const ESLINT_DISABLE_RE = /^eslint-disable(?:-next-line|-line)?(?<rulesBlock>.*)/;

export function getRulesBlockFromEslintDisableComment(
  comment: Eslint.AST.Program['comments'][0]
): string | null | undefined {
  const commentVal = comment.value.trim();
  const nakedESLintRegexResult = commentVal.match(ESLINT_DISABLE_RE);
  const rulesBlock = nakedESLintRegexResult?.groups?.rulesBlock;

  // no regex match
  if (!nakedESLintRegexResult) {
    return null;
  }

  return rulesBlock;
}
