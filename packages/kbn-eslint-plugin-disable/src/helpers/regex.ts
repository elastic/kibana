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
  /^(?<directive>(?:eslint|oxlint)-(?<disableValueType>disable(?:-next-line|-line)?))(?<rulesBlock>.*)/;

export type DisableValueType = 'disable' | 'disable-line' | 'disable-next-line';

export interface ParsedDisableComment extends Pick<Comment, 'type' | 'range' | 'loc'> {
  /** The directive as written, e.g. `eslint-disable-next-line` or `oxlint-disable`. */
  directive: string;
  disableValueType: DisableValueType;
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

  const { directive, disableValueType, rulesBlock } = regexResult.groups;

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
    directive,
    // DISABLE_DIRECTIVE_RE only captures the three DisableValueType values
    disableValueType: disableValueType as DisableValueType,
    rules,
  };
}
