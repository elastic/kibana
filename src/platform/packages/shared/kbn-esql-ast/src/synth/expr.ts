/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParseOptions } from '../parser';
import { EsqlQuery } from '../query';
import { firstItem } from '../visitor/utils';
import { makeSynthNode, createSynthMethod } from './helpers';
import type { SynthGenerator } from './types';
import type { ESQLAstExpression } from '../types';

const generator: SynthGenerator<ESQLAstExpression> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstExpression => {
  const querySrc = 'FROM a | STATS ' + src;
  const query = EsqlQuery.fromSrc(querySrc, { withFormatting, ...rest });
  const where = query.ast.commands[1];
  const expression = firstItem(where.args)!;

  makeSynthNode(expression);

  return expression;
};

export const expr = createSynthMethod<ESQLAstExpression>(generator);
