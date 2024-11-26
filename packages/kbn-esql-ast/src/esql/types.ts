/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParseOptions } from '../parser';
import { ESQLAstExpression } from '../types';

export type SynthGenerator = (src: string, opts?: ParseOptions) => ESQLAstExpression;

export type SynthTaggedTemplate = (
  template: TemplateStringsArray,
  ...params: Array<ESQLAstExpression | string>
) => ESQLAstExpression;

export type SynthTaggedTemplateWithOpts = (opts?: ParseOptions) => SynthTaggedTemplate;
