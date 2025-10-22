/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from 'liquidjs';
import {
  AssignTag,
  CaptureTag,
  CaseTag,
  ForTag,
  IfTag,
  Liquid,
  Output,
  TablerowTag,
  Tag,
  Token,
  TokenKind,
  UnlessTag,
  Value,
} from 'liquidjs';
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
  for (const part of parts) {
    if (stack.toReversed().some((frame) => frame.variables.has(part))) {
      const localVarPattern = new RegExp(`\\[${part}\\]`);
      const match = propertyPath.match(localVarPattern);
      if (match && match.index !== undefined) {
        return propertyPath.substring(0, match.index);
      }
      return parts[0];
    }
  }
  return propertyPath;
}

function visitLiquidAST(node: unknown, stack: StackEntry[]): string[] {
  if (node instanceof Output) {
    return visitLiquidAST(node.value, stack);
  }

  if (node instanceof Value) {
    const fromInitial = node.initial.postfix.flatMap((token) => visitLiquidAST(token, stack));
    const fromFilters = node.filters.flatMap((filter) =>
      filter.args ? filter.args.flatMap((arg) => visitLiquidAST(arg, stack)) : []
    );
    return fromInitial.concat(fromFilters);
  }

  if (node instanceof Tag) {
    return visitTag(node, stack);
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
      // Dirty solution but works. For some reason specific value tokens are not exported by public API.
      // See this GH issue - https://github.com/harttle/liquidjs/issues/823
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

function visitTag(node: Tag, stack: StackEntry[]): string[] {
  try {
    stack.push({ node: node.name, variables: new Set<string>() });

    if (node instanceof IfTag) {
      const fromBranches = node.branches.flatMap((branch) => {
        const fromValue = visitLiquidAST(branch.value, stack);
        const fromTemplates = branch.templates.flatMap((template) =>
          visitLiquidAST(template, stack)
        );
        return fromValue.concat(fromTemplates);
      });
      const fromElse = node.elseTemplates
        ? node.elseTemplates.flatMap((template) => visitLiquidAST(template, stack))
        : [];
      return [...fromBranches, ...fromElse];
    }

    if (node instanceof ForTag) {
      // put variable to the current scope
      stack.at(-1)?.variables.add(node.variable);
      const fromCollection = visitLiquidAST(node.collection, stack);
      const fromHash =
        node.hash && node.hash.hash
          ? Object.values(node.hash.hash).flatMap((value) => visitLiquidAST(value, stack))
          : [];
      const fromBody = node.templates.flatMap((template) => visitLiquidAST(template, stack));
      return fromCollection.concat(fromHash).concat(fromBody);
    }

    if (node instanceof AssignTag) {
      const localScope = Array.from(node.localScope());
      const firstArg = localScope[0];
      const variableName = firstArg.getText();
      const args = Array.from(node.arguments());
      const result = args.flatMap((arg) => visitLiquidAST(arg, stack));
      // put variable to the higher scope
      stack.at(-2)?.variables.add(variableName);
      return result;
    }

    if (node instanceof UnlessTag) {
      const fromBranches = node.branches.flatMap((branch) => {
        const fromValue = visitLiquidAST(branch.value, stack);
        const fromTemplates = branch.templates.flatMap((template) =>
          visitLiquidAST(template, stack)
        );
        return fromValue.concat(fromTemplates);
      });
      const fromElse = node.elseTemplates
        ? node.elseTemplates.flatMap((template) => visitLiquidAST(template, stack))
        : [];
      return [...fromBranches, ...fromElse];
    }

    if (node instanceof CaseTag) {
      const fromCondition = visitLiquidAST(node.value, stack);
      const fromBranches = node.branches.flatMap((branch) => {
        const fromValues = branch.values.flatMap((value) => visitLiquidAST(value, stack));
        const fromTemplates = branch.templates.flatMap((template) =>
          visitLiquidAST(template, stack)
        );
        return fromValues.concat(fromTemplates);
      });
      const fromElse = node.elseTemplates.flatMap((template) => visitLiquidAST(template, stack));
      return [...fromCondition, ...fromBranches, ...fromElse];
    }

    if (node instanceof CaptureTag) {
      const variableName = node.variable;
      const fromBody = node.templates.flatMap((template) => visitLiquidAST(template, stack));
      // put variable to the higher scope
      stack.at(-2)?.variables.add(variableName);
      return fromBody;
    }

    if (node instanceof TablerowTag) {
      // put variable to the current scope
      stack.at(-1)?.variables.add(node.variable);
      const fromCollection = visitLiquidAST(node.collection, stack);
      const fromArgs =
        node.args && node.args.hash
          ? Object.values(node.args.hash).flatMap((value) => visitLiquidAST(value, stack))
          : [];
      const fromBody = node.templates.flatMap((template) => visitLiquidAST(template, stack));
      return fromCollection.concat(fromArgs).concat(fromBody);
    }
  } finally {
    stack.pop();
  }

  return [];
}

export function extractTemplateVariables(template: string): string[] {
  const ast: Template[] = liquidEngine.parse(template); // Pre-parse to ensure syntax is valid
  const stack: StackEntry[] = [{ node: 'root', variables: new Set<string>() }];
  const foundVariables: string[] = ast.flatMap((node) => visitLiquidAST(node, stack));
  const distictVariables = Array.from(new Set(foundVariables));
  return distictVariables;
}
