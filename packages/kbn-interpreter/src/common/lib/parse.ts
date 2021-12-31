/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ast, AstWithMeta } from './ast';
import { parse } from '../../../grammar';

interface Options {
  startRule?: string;
}

interface OptionsWithMeta extends Options {
  addMeta: true;
}

export interface Parse {
  (input: string, options?: Options): Ast;
  (input: string, options: OptionsWithMeta): AstWithMeta;
}

const typedParse = parse;

export { typedParse as parse };
