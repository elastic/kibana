/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParseOptions } from '../parser';
import { Parser } from '../parser';
import { createTag } from './tag';
import { SynthNode } from './synth_node';
import type { SynthGenerator } from './types';
import type { ESQLAstQueryExpression } from '../types';

const generator: SynthGenerator<ESQLAstQueryExpression> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstQueryExpression => {
  src = src.trimStart();
  const { root } = Parser.parseQuery(src, { withFormatting, ...rest });
  const node = SynthNode.from(root);

  return node;
};

export const query = createTag<ESQLAstQueryExpression>(generator);

/**
 * Short 3-letter alias for DX convenience.
 */
export const qry = query;
