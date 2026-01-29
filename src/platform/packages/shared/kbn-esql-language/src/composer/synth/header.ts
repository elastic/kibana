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
import { SynthNode } from './synth_node';
import type { SynthGenerator } from './types';
import type { ESQLAstHeaderCommand } from '../../types';

const generator: SynthGenerator<ESQLAstHeaderCommand> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLAstHeaderCommand => {
  src = src.trimStart();

  const { root } = Parser.parseHeaderCommand(src, { withFormatting, ...rest });

  // The parser returns the header command as ESQLCommand type, but it's actually
  // an ESQLAstSetHeaderCommand at runtime
  const node = SynthNode.from(root as any);

  return node;
};

export const header = createTag<ESQLAstHeaderCommand>(generator);

/**
 * Short 3-letter alias for DX convenience.
 */
export const hdr = header;
