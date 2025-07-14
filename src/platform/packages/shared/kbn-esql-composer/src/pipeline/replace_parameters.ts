/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstQueryExpression, Walker } from '@kbn/esql-ast';
import { ParameterReplacer } from '../transformers/parameter_replacer';
import { Params } from '../types';

export function replaceParameters(queryAst: ESQLAstQueryExpression, params?: Params) {
  const parameterReplacer = new ParameterReplacer(params);
  Walker.walk(queryAst, {
    visitLiteral: (node) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        Object.assign(node, parameterReplacer.replace(node));
      }
    },
    visitColumn: (node) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        Object.assign(node, parameterReplacer.replace(node));
      }
    },
    visitFunction: (node) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        Object.assign(node, parameterReplacer.replace(node));
      }
    },
  });
}
