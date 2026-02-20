/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-language';
import { Walker } from '@kbn/esql-language';
import { ParameterReplacer } from '../transformers/parameter_replacer';
import type { Params } from '../types';

/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export function replaceParameters(queryAst: ESQLAstQueryExpression, params?: Params) {
  const parameterReplacer = new ParameterReplacer(params);
  Walker.walk(queryAst, {
    visitLiteral: (node, parent) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        replaceInPlace(node, parameterReplacer.replace(node, parent));
      }
    },
    visitColumn: (node, parent) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        replaceInPlace(node, parameterReplacer.replace(node, parent));
      }
    },
    visitFunction: (node) => {
      if (parameterReplacer.shouldReplaceNode(node)) {
        replaceInPlace(node, parameterReplacer.replace(node));
      }
    },
  });
}

function replaceInPlace<T extends Record<string, any>>(target: T, replacement: T): void {
  Object.keys(target).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(replacement, key)) {
      delete target[key];
    }
  });

  Object.assign(target, replacement);
}
