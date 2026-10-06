/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Comment } from '@oxlint/plugins';

const DISABLE_DIRECTIVE_RE =
  /^(?<directive>(?:eslint|oxlint)-disable(?:-next-line|-line)?)(?<rulesBlock>.*)/;

export enum DISABLE_VALUE {
  DISABLE = 'disable',
  DISABLE_NEXT_LINE = 'disable-next-line',
  DISABLE_LINE = 'disable-line',
}

export interface ParsedDisableComment {
  type: Comment['type'];
  range: Comment['range'];
  loc: Comment['loc'];
  value: Comment['value'];
  /** The directive as written, e.g. `eslint-disable-next-line` or `oxlint-disable`. */
  directive: string;
  disableValueType: DISABLE_VALUE;
  rules: string[];
}

/** Parses an `eslint-disable*` or `oxlint-disable*` comment; returns undefined for other comments. */
export function parseDisableComment(comment: Comment): ParsedDisableComment | undefined {
  const commentVal = comment.value.trim();
  const regexResult = commentVal.match(DISABLE_DIRECTIVE_RE);

  // no regex match
  if (!regexResult?.groups) {
    return;
  }

  const { directive, rulesBlock } = regexResult.groups;
  const disableValueType = directive.endsWith(DISABLE_VALUE.DISABLE_NEXT_LINE)
    ? DISABLE_VALUE.DISABLE_NEXT_LINE
    : directive.endsWith(DISABLE_VALUE.DISABLE_LINE)
    ? DISABLE_VALUE.DISABLE_LINE
    : DISABLE_VALUE.DISABLE;

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
    directive,
    disableValueType,
    rules,
  };
}
