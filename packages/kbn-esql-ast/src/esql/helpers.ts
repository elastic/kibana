/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import { Walker, WalkerAstNode } from '../walker/walker';

export const clearParserFields = (ast: WalkerAstNode) => {
  Walker.walk(ast, {
    visitAny: (node) => {
      Object.assign(node, Builder.parserFields({}));
    },
  });
};
