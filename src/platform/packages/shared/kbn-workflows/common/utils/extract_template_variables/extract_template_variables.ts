/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from 'liquidjs';
import { ForTag, IfTag, AssignTag, Liquid, Output, Token, TokenKind, Value } from 'liquidjs';
import { parseJsPropertyAccess } from '../parse_js_property_access/parse_js_property_access';

const liquidEngine = new Liquid({
  strictFilters: false,
  strictVariables: false,
});

liquidEngine.registerFilter('json_parse', (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
});

interface StackEntry {
  node: string;
  variables: Set<string>;
}

function truncatePathAtLocalVariable(
  propertyPath: string,
  parts: string[],
  stack: StackEntry[]
): string {
  // Check if any parts after the first are local variables (used as indices)
  // If so, truncate the path at that point
  for (let i = 1; i < parts.length; i++) {
    if (stack.toReversed().some((frame) => frame.variables.has(parts[i]))) {
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

function visitLiquidAST(node: unknown, stack: StackEntry[]): string[] {
  if (node instanceof Output) {
    return visitLiquidAST(node.value, stack);
  }

  if (node instanceof Value) {
    return node.initial.postfix.flatMap((token) => visitLiquidAST(token, stack));
  }

  if (node instanceof IfTag) {
    stack.push({ node: 'if', variables: new Set<string>() });
    const fromBranches = node.branches.flatMap((branch) => {
      const fromValue = visitLiquidAST(branch.value, stack);
      const fromTemplates = branch.templates.flatMap((template) => visitLiquidAST(template, stack));
      return fromValue.concat(fromTemplates);
    });
    stack.pop();
    return [...fromBranches];
  }

  if (node instanceof ForTag) {
    stack.push({ node: 'for', variables: new Set<string>([node.variable]) });

    const fromCollection = visitLiquidAST(node.collection, stack);
    const fromBody = node.templates.flatMap((template) => visitLiquidAST(template, stack));
    stack.pop();
    return fromCollection.concat(fromBody);
  }

  if (node instanceof AssignTag) {
    const localScope = Array.from(node.localScope());
    const firstArg = localScope[0];
    const variableName = firstArg.getText();
    const args = Array.from(node.arguments());
    const result = args.flatMap((arg) => visitLiquidAST(arg, stack));
    stack.at(-1)?.variables.add(variableName);
    return result;
  }

  if (node instanceof Token) {
    if (node.kind === TokenKind.PropertyAccess) {
      const propertyPath = node.getText();
      const parts = parseJsPropertyAccess(propertyPath);

      // If the root variable is local, skip it entirely
      if (stack.toReversed().some((frame) => frame.variables.has(parts[0]))) {
        return [];
      }

      return [truncatePathAtLocalVariable(propertyPath, parts, stack)];
    }

    // Handle Range tokens
    if (node.kind === TokenKind.Range) {
      const rangeText = node.getText();
      // Extract start and end from range like "(start..end)" or "1..5"
      const vars = rangeText
        .replace(/[()]/g, '')
        .split('..')
        .map((v) => v.trim())
        .filter(
          (v) => !/^\d+$/.test(v) && !stack.toReversed().some((frame) => frame.variables.has(v))
        );
      return vars;
    }
  }

  return [];
}

export function extractTemplateVariables(template: string): string[] {
  const ast: Template[] = liquidEngine.parse(template); // Pre-parse to ensure syntax is valid
  const stack: StackEntry[] = [];
  const foundVariables: string[] = ast.flatMap((node) => visitLiquidAST(node, stack));
  const distictVariables = Array.from(new Set(foundVariables));
  return distictVariables;
}
