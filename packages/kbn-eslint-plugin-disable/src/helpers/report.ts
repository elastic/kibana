/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AST } from 'eslint';
import { ESLINT_DISABLE_VALUE, ParsedEslintDisableComment } from './regex';

export function getReportLocFromComment(
  comment: ParsedEslintDisableComment
): AST.SourceLocation | undefined {
  const cStart = comment?.loc?.start;
  const cEnd = comment?.loc?.end;
  const cStartLine = comment?.loc?.start?.line;

  // start or end loc is undefined, exit early
  if (cStart === undefined || cEnd === undefined || cStartLine === undefined) {
    return;
  }

  const disableStartsOnNextLine =
    comment.disableValueType === ESLINT_DISABLE_VALUE.DISABLE_NEXT_LINE;
  const disableStartsInline = comment.disableValueType === ESLINT_DISABLE_VALUE.DISABLE_LINE;
  const cStartColumn = comment?.loc?.start?.column ?? 0;
  return disableStartsOnNextLine
    ? { start: cStart, end: cEnd }
    : {
        // At this point we could have eslint-disable block or an eslint-disable-line.
        // If we have an inline disable we need to report the column as -1 in order to get the report
        start: { line: cStartLine, column: disableStartsInline ? -1 : cStartColumn - 1 },
        end: cEnd,
      };
}
