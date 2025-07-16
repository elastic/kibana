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
import { makeSynthNode, createSynthMethod } from './helpers';
import type { SynthGenerator } from './types';
import type { ESQLAstQueryExpression } from '../types';

const generator: SynthGenerator<ESQLAstQueryExpression> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstQueryExpression => {
  src = src.trimStart();
  const query = EsqlQuery.fromSrc(src, { withFormatting, ...rest });
  const node = query.ast;

  makeSynthNode(node);

  return node;
};

export const esql = createSynthMethod<ESQLAstQueryExpression>(generator);
