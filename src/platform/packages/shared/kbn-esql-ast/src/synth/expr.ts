/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParseOptions, Parser } from '../parser';
import { makeSynthNode, createSynthMethod } from './helpers';
import type { SynthGenerator } from './types';
import type { ESQLAstExpression } from '../types';

const generator: SynthGenerator<ESQLAstExpression> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstExpression => {
  const { root: expression } = Parser.parseExpression(src, { withFormatting, ...rest });

  makeSynthNode(expression);

  return expression;
};

export const expr = createSynthMethod<ESQLAstExpression>(generator);
