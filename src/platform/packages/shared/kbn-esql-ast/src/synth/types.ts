/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParseOptions } from '../parser';
import type { ESQLAstExpression, ESQLProperNode } from '../types';

export type SynthGenerator<N extends ESQLProperNode> = (src: string, opts?: ParseOptions) => N;

export type SynthTaggedTemplate<N extends ESQLProperNode> = (
  template: TemplateStringsArray,
  ...params: Array<ESQLAstExpression | string>
) => N;

export type SynthTaggedTemplateWithOpts<N extends ESQLProperNode> = (
  opts?: ParseOptions
) => SynthTaggedTemplate<N>;

export type SynthMethod<N extends ESQLProperNode> = SynthGenerator<N> &
  SynthTaggedTemplate<N> &
  SynthTaggedTemplateWithOpts<N>;
