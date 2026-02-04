/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParseOptions } from '../../parser';
import { Parser } from '../../parser';
import { createTag } from './tag';
import type { SynthGenerator } from './types';
import type { ESQLAstExpression } from '../../types';
import { SynthNode } from './synth_node';

const generator: SynthGenerator<ESQLAstExpression> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstExpression => {
  const { root } = Parser.parseExpression(src, { withFormatting, ...rest });
  const node = SynthNode.from(root);

  return node;
};

export const expression = createTag<ESQLAstExpression>(generator);

/**
 * Short 3-letter alias for DX convenience.
 */
export const exp = expression;
