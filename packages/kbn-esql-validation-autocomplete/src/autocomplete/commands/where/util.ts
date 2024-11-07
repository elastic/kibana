/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand, ESQLSingleAstItem } from '@kbn/esql-ast';
import { isColumnItem, isFunctionItem } from '../../../shared/helpers';

export type CaretPosition =
  | 'after_column'
  | 'after_function'
  | 'after_not'
  | 'after_operator'
  | 'empty_expression';

export const getPosition = (innerText: string, command: ESQLCommand): CaretPosition => {
  if (/ not$/i.test(innerText.trimEnd())) {
    return 'after_not';
  }

  const expressionRoot = command.args[0] as ESQLSingleAstItem | undefined;

  if (expressionRoot) {
    if (isColumnItem(expressionRoot)) {
      return 'after_column';
    }

    if (isFunctionItem(expressionRoot) && expressionRoot.subtype === 'variadic-call') {
      return 'after_function';
    }

    if (isFunctionItem(expressionRoot) && expressionRoot.subtype !== 'variadic-call') {
      return 'after_operator';
    }
  }

  return 'empty_expression';
};
