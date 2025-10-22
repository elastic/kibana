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

function truncatePathAtLocalVariable(
  propertyPath: string,
  parts: string[],
  localVariablesSet: Set<string>
): string {
  // Check if any parts after the first are local variables (used as indices)
  // If so, truncate the path at that point
  for (let i = 1; i < parts.length; i++) {
    if (localVariablesSet.has(parts[i])) {
      // Found a local variable used as an index/property
      // Find where this appears in the original string and truncate there
      const localVarPattern = new RegExp(`\\[${parts[i]}\\]`);
      const match = propertyPath.match(localVarPattern);
      if (match && match.index !== undefined) {
        // Return everything before the bracket containing the local variable
        return propertyPath.substring(0, match.index);
      }
      // Fallback: just return the root if we can't find the pattern
      return parts[0];
    }
  }

  // No truncation needed, return the full path
  return propertyPath;
}

function visitLiquidAST(node: unknown, localVariablesSet: Set<string>): string[] {
  if (node instanceof Output) {
    return visitLiquidAST(node.value.initial, localVariablesSet);
  }

  if (node instanceof Expression) {
    return node.postfix.flatMap((token) => visitLiquidAST(token, localVariablesSet));
  }

  if (node instanceof IfTag) {
    const fromBranches = node.branches.flatMap((branch) => {
      const fromValue = visitLiquidAST(branch.value.initial, localVariablesSet);
      const fromTemplates = branch.templates.flatMap((template) =>
        visitLiquidAST(template, localVariablesSet)
      );
      return fromValue.concat(fromTemplates);
    });
    return [...fromBranches];
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
      const propertyPath = node.getText();
      const parts = parseJsPropertyAccess(propertyPath);

      // If the root variable is local, skip it entirely
      if (localVariablesSet.has(parts[0])) {
        return [];
      }

      return [truncatePathAtLocalVariable(propertyPath, parts, localVariablesSet)];
    }

    // Handle Range tokens
    if (node.kind === TokenKind.Range) {
      const rangeText = node.getText();
      // Extract start and end from range like "(start..end)" or "1..5"
      const vars = rangeText
        .replace(/[()]/g, '')
        .split('..')
        .map((v) => v.trim())
        .filter((v) => !/^\d+$/.test(v) && !localVariablesSet.has(v));
      return vars;
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
