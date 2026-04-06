/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import dateMath from '@kbn/datemath';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type {
  KqlFunctionNode,
  KqlLiteralNode,
  KqlWildcardNode,
} from '@kbn/es-query/src/kuery/node_types';
import { KQL_NODE_TYPE_WILDCARD, nodeTypes } from '@kbn/es-query/src/kuery/node_types';
import { parseJsPropertyAccess } from '@kbn/workflows/common/utils';

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
  const [leftLiteral, rightLiteral] = node.arguments as [KqlLiteralNode, unknown];
  const { value: contextValue, pathExists } = readContextPath(leftLiteral.value, context);

  if (!pathExists) {
    return false; // Path does not exist in context
  }

  if ((rightLiteral as KqlWildcardNode).type === KQL_NODE_TYPE_WILDCARD) {
    if (typeof contextValue === 'string') {
      return nodeTypes.wildcard.test(rightLiteral as KqlWildcardNode, String(contextValue));
    }

    return contextValue != null && contextValue !== undefined;
  }

  try {
    return (
      contextValue ===
      convertLiteralToValue(rightLiteral as KqlLiteralNode, typeof contextValue as any)
    );
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
  const propertyPathSegments = parseJsPropertyAccess(strPropertyPath);
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
    case 'string': {
      const strValue = String(node.value);
      const parsed = dateMath.parse(strValue);
      if (parsed?.isValid()) {
        // it's a date math expression, return the resolved ISO string
        return parsed.toISOString();
      }

      return strValue;
    }
    case 'number':
      return parseFloat(node.value as string);
    case 'boolean':
      return String(node.value) === 'true';
    default:
      throw new Error(`Unsupported type: ${expectedType}`);
  }
}
