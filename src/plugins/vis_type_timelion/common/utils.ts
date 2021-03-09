/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimelionExpressionArgument } from './parser';
import { parseTimelionExpressionAsync } from './parser_async';

const isEsIndexArgument = ({ type, name, function: fn }: TimelionExpressionArgument) =>
  type === 'namedArg' && fn === 'es' && name === 'index';

export const extractIndexesFromExpression = async (expression: string) => {
  const args = (await parseTimelionExpressionAsync(expression))?.args ?? [];

  return args.reduce<string[]>((acc, arg) => {
    if (arg.value && isEsIndexArgument(arg)) {
      acc.push(arg.value.text);
    }
    return acc;
  }, []);
};
