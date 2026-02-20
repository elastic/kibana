/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PromQLAstNode } from '../../embedded_languages/promql/types';
import type {
  ESQLAstCommand,
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommandOption,
  ESQLFunction,
  ESQLIdentifier,
  ESQLInlineCast,
  ESQLList,
  ESQLLiteral,
  ESQLOrderExpression,
  ESQLProperNode,
  ESQLSource,
  ESQLUnknownItem,
} from '../../types';

export type NodeMatchKeys =
  | keyof ESQLAstCommand
  | keyof ESQLAstQueryExpression
  | keyof ESQLFunction
  | keyof ESQLCommandOption
  | keyof ESQLSource
  | keyof ESQLColumn
  | keyof ESQLList
  | keyof ESQLLiteral
  | keyof ESQLIdentifier
  | keyof ESQLInlineCast
  | keyof ESQLOrderExpression
  | keyof ESQLUnknownItem;

export type NodeMatchTemplateKey<V> = V | V[] | RegExp;

export type NodeMatchTemplate = {
  [K in NodeMatchKeys]?: K extends keyof ESQLProperNode
    ? NodeMatchTemplateKey<ESQLProperNode[K]>
    : NodeMatchTemplateKey<unknown>;
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
  const predicate = (node: ESQLProperNode) => {
    for (const key of keys) {
      const matcher = template[key];
      if (matcher instanceof Array) {
        if (!(matcher as any[]).includes(node[key])) {
          return false;
        }
      } else if (matcher instanceof RegExp) {
        if (!matcher.test(String(node[key]))) {
          return false;
        }
      } else if (node[key] !== matcher) {
        return false;
      }
    }

    return true;
  };

  return predicate;
};

export const replaceProperties = (obj: object, replacement: object) => {
  for (const key in obj) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key))
      delete (obj as any)[key];
  }
  Object.assign(obj, replacement);
};

export const isPromqlNode = (node: unknown): node is PromQLAstNode => {
  return (
    typeof node === 'object' &&
    node !== null &&
    'dialect' in node &&
    (node as { dialect: unknown }).dialect === 'promql'
  );
};
