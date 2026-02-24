/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPromqlNode } from './is';
import type { PromQLAstNode } from '../types';

export function* childrenOfPromqlNode(node: PromQLAstNode): Iterable<PromQLAstNode> {
  if (!isPromqlNode(node)) {
    return;
  }

  switch (node.type) {
    case 'query': {
      if (node.expression) {
        yield node.expression;
      }
      return;
    }
    case 'function': {
      if (node.grouping) {
        yield node.grouping;
      }
      yield* node.args;
      return;
    }
    case 'selector': {
      yield* node.args;
      return;
    }
    case 'label': {
      const { labelName, value } = node;
      if (labelName) yield labelName;
      if (value) yield value;
      return;
    }
  }

  if ('args' in node && Array.isArray(node.args)) {
    yield* node.args;
    return;
  }
}
