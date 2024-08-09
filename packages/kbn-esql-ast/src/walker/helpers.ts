/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLProperNode } from '../types';

export type NodeMatchTemplateKey<V> = V | V[] | RegExp;
export type NodeMatchTemplate = {
  [K in keyof ESQLProperNode]?: NodeMatchTemplateKey<ESQLProperNode[K]>;
};

/**
 * Creates a predicate function which matches a single AST node against a
 * template object. The template object should have the same keys as the
 * AST node, and the values should be:
 *
 * - An array matches if the node key is in the array.
 * - A RegExp matches if the node key matches the RegExp.
 * - Any other value matches if the node key is triple-equal to the value.
 *
 * @param template Template from which to create a predicate function.
 * @returns A predicate function that matches nodes against the template.
 */
export const templateToPredicate = (
  template: NodeMatchTemplate
): ((node: ESQLProperNode) => boolean) => {
  const keys = Object.keys(template) as Array<keyof ESQLProperNode>;
  const predicate = (child: ESQLProperNode) => {
    for (const key of keys) {
      const matcher = template[key];
      if (matcher instanceof Array) {
        if (!(matcher as any[]).includes(child[key])) {
          return false;
        }
      } else if (matcher instanceof RegExp) {
        if (!matcher.test(String(child[key]))) {
          return false;
        }
      } else if (child[key] !== matcher) {
        return false;
      }
    }

    return true;
  };

  return predicate;
};
