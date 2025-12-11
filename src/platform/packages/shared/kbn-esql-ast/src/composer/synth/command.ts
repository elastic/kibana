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
import type { ESQLCommand } from '../../types';

const generator: SynthGenerator<ESQLCommand> = (
  src: string,
  { withFormatting = true, ...rest }: ParseOptions = {}
): ESQLCommand => {
  src = src.trimStart();

  const { root } = Parser.parseCommand(src, { withFormatting, ...rest });

  if (root.type !== 'command') {
    throw new Error('Expected a command node');
  }

  const node = SynthNode.from(root);

  return node;
};

export const command = createTag<ESQLCommand>(generator);

/**
 * Short 3-letter alias for DX convenience.
 */
export const cmd = command;
