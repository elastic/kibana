/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression, KueryNode } from '@kbn/es-query';
import { KqlLiteralNode, KQL_NODE_TYPE_WILDCARD, KqlFunctionNode } from '@kbn/es-query/src/kuery/node_types';

export function evaluateKql(kql: string, context: Record<string, any>): boolean {
  try {
    const kqlAst = fromKueryExpression(kql);
    return evaluate(kqlAst, context);
  } catch (error) {
    console.error(`Error evaluating KQL: ${error.message}`);
    return false;
  }
}

function evaluate(node: KueryNode, context: Record<string, any>): boolean {
  if (node.type === 'function') {
    const functionNode = node as KqlFunctionNode;

    switch (functionNode.function) {
      case 'and':
        return functionNode.arguments.every((arg) => evaluate(arg as KueryNode, context));
      case 'or':
        return functionNode.arguments.some((arg) => evaluate(arg as KueryNode, context));
      case 'not':
        return !evaluate(functionNode.arguments[0] as KueryNode, context);
      case 'range':
        return visitRange(functionNode, context);
      case 'is':
        return visitIs(functionNode, context);
      // Add more cases for other functions as needed
      default:
        return false;
    }
  }

  return true;
}

function visitIs(node: KqlFunctionNode, context: Record<string, any>): boolean {
  const [leftLiteral, rightLiteral] = node.arguments as [KqlLiteralNode, KqlLiteralNode];
  const { value: contextValue, pathExists } = readValue(leftLiteral.value, context);

  if (!pathExists) {
    return false; // Path does not exist in context
  }

  if ((rightLiteral.type as any) === KQL_NODE_TYPE_WILDCARD) {
    // Handle wildcard matching
    // const regex = new RegExp(`^${rightLiteral.value.replace('*', '.*')}$`);
    // return regex.test(String(contextValue));
    return true;
  }

  return contextValue === convertLiteralToValue(rightLiteral, typeof contextValue as any);
}

function visitRange(functionNode: KqlFunctionNode, context: Record<string, any>): boolean {
  const [leftRangeLiteral, operator, rightRangeLiteral] = functionNode.arguments as [
    KqlLiteralNode,
    string,
    KqlLiteralNode
  ];

  const { value: leftRangeValue, pathExists } = readValue(leftRangeLiteral.value, context);

  if (!pathExists) {
    return false; // Path does not exist in context
  }

  const rightRangeValue = convertLiteralToValue(rightRangeLiteral, typeof leftRangeValue as any);

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

function readValue(key: any, context: Record<string, any>): { pathExists: boolean; value: any } {
  const strKey = String(key);
  const splittedKey = strKey.split('.');
  let result: any = context;

  for (const part of splittedKey) {
    if (!(part in result)) {
      return { pathExists: false, value: undefined }; // Path not found in context
    }

    if (result[part] === undefined) {
      // Path found, but value is undefined
      result = undefined;
      break;
    }
    result = result[part];
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
