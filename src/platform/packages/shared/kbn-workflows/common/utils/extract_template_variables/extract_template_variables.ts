/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from 'liquidjs';
import { Expression, ForTag, IfTag, Liquid, Output, Token, TokenKind } from 'liquidjs';
import { parseJsPropertyAccess } from '../parse_js_property_access/parse_js_property_access';

const liquidEngine = new Liquid({
  strictFilters: true,
  strictVariables: false,
});

function visitLiquidAST(node: unknown, localVariablesSet: Set<string>): string[] {
  if (node instanceof Output) {
    return visitLiquidAST(node.value.initial, localVariablesSet);
  }

  if (node instanceof Expression) {
    return node.postfix.flatMap((token) => visitLiquidAST(token, localVariablesSet));
  }

  if (node instanceof IfTag) {
    return node.branches.flatMap((branch) => {
      return visitLiquidAST(branch.value.initial, localVariablesSet);
    });
  }

  if (node instanceof ForTag) {
    localVariablesSet.add(node.variable);
    const fromCollection = visitLiquidAST(node.collection, localVariablesSet);
    const fromBody = node.templates
      .flatMap((template) => visitLiquidAST(template, localVariablesSet))
      .filter((prop) => !localVariablesSet.has(parseJsPropertyAccess(prop)[0]));
    localVariablesSet.delete(node.variable);
    return fromCollection.concat(fromBody);
  }

  if (node instanceof Token) {
    if (node.kind === TokenKind.PropertyAccess) {
      return [node.getText()];
    }
  }

  return [];
}

export function extractTemplateVariables(template: string): string[] {
  const ast: Template[] = liquidEngine.parse(template); // Pre-parse to ensure syntax is valid
  const foundVariables: string[] = ast.flatMap((node) => visitLiquidAST(node, new Set<string>()));
  const distictVariables = Array.from(new Set(foundVariables));
  return distictVariables;
}
