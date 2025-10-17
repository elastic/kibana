/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { KqlLiteralNode, KqlFunctionNode } from '@kbn/es-query/src/kuery/node_types';
import { KQL_NODE_TYPE_WILDCARD } from '@kbn/es-query/src/kuery/node_types';

export function evaluateKql(kql: string, context: Record<string, any>): boolean {
  const kqlAst = fromKueryExpression(kql);
  return evaluateRecursive(kqlAst, context);
}

function evaluateRecursive(node: KueryNode, context: Record<string, any>): boolean {
  if (node.type === 'function') {
    const functionNode = node as KqlFunctionNode;

    switch (functionNode.function) {
      case 'and':
        return functionNode.arguments.every((arg) => evaluateRecursive(arg as KueryNode, context));
      case 'or':
        return functionNode.arguments.some((arg) => evaluateRecursive(arg as KueryNode, context));
      case 'not':
        return !evaluateRecursive(functionNode.arguments[0] as KueryNode, context);
      case 'range':
        return visitRange(functionNode, context);
      case 'is':
        return visitIs(functionNode, context);
      default:
        return false;
    }
  }

  return true;
}

function visitIs(node: KqlFunctionNode, context: Record<string, any>): boolean {
  const [leftLiteral, rightLiteral] = node.arguments as [KqlLiteralNode, KqlLiteralNode];
  const { value: contextValue, pathExists } = readContextPath(leftLiteral.value, context);

  if (!pathExists) {
    return false; // Path does not exist in context
  }

  if ((rightLiteral.type as any) === KQL_NODE_TYPE_WILDCARD) {
    return true;
  } else if (typeof contextValue === 'string') {
    return wildcardToRegex(rightLiteral.value?.toString() as string).test(contextValue);
  }

  try {
    return contextValue === convertLiteralToValue(rightLiteral, typeof contextValue as any);
  } catch (error) {
    return false;
  }
}

function visitRange(functionNode: KqlFunctionNode, context: Record<string, any>): boolean {
  const [leftRangeLiteral, operator, rightRangeLiteral] = functionNode.arguments as [
    KqlLiteralNode,
    string,
    KqlLiteralNode
  ];

  const { value: leftRangeValue, pathExists } = readContextPath(leftRangeLiteral.value, context);

  if (!pathExists) {
    return false; // Path does not exist in context
  }

  let rightRangeValue;

  try {
    rightRangeValue = convertLiteralToValue(rightRangeLiteral, typeof leftRangeValue as any);
  } catch (error) {
    return false;
  }

  switch (operator) {
    case 'gte':
      return leftRangeValue >= rightRangeValue;
    case 'lte':
      return leftRangeValue <= rightRangeValue;
    case 'gt':
      return leftRangeValue > rightRangeValue;
    case 'lt':
      return leftRangeValue < rightRangeValue;
    default:
      throw new Error(`Unsupported range operator: ${operator}`);
  }
}

function readContextPath(
  propertyPath: any,
  context: Record<string, any>
): { pathExists: boolean; value: any } {
  const strPropertyPath = String(propertyPath); // sometimes it could be boolean or number
  const propertyPathSegments = strPropertyPath.split('.');
  let result: any = context;

  for (const segment of propertyPathSegments) {
    if (!(segment in result)) {
      return { pathExists: false, value: undefined }; // Path not found in context
    }

    result = result[segment];
  }

  return { pathExists: true, value: result };
}

function convertLiteralToValue(
  node: KqlLiteralNode,
  expectedType: 'string' | 'number' | 'boolean'
): any {
  switch (expectedType) {
    case 'string':
      return String(node.value);
    case 'number':
      return parseFloat(node.value as string);
    case 'boolean':
      return String(node.value) === 'true';
    default:
      throw new Error(`Unsupported type: ${expectedType}`);
  }
}

function wildcardToRegex(value: string): RegExp {
  const tokenized = value
    // Temporarily replace escaped wildcards with placeholders
    .replace(/\\\\/g, '__ESCAPED_BACKSLASH__') // handles \\ correctly
    .replace(/\\\*/g, '__LITERAL_AST__')
    .replace(/\\\?/g, '__LITERAL_Q__')

    // Escape regex metacharacters (except wildcards)
    .replace(/([.+^${}()|[\]\\])/g, '\\$1')

    // Convert real wildcards
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

    // Restore literal wildcards
    .replace(/__LITERAL_AST__/g, '\\*')
    .replace(/__LITERAL_Q__/g, '\\?')
    .replace(/__ESCAPED_BACKSLASH__/g, '\\\\');
  const wildcardPattern = `^${tokenized}$`;

  return new RegExp(wildcardPattern);
}
