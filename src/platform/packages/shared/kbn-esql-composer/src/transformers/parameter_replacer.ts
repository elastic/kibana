/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLAstBaseItem,
  ESQLColumn,
  ESQLFunction,
  ESQLLiteral,
  ESQLParamLiteral,
} from '@kbn/esql-language';
import { Builder, isColumn, isFunctionExpression, isParamLiteral } from '@kbn/esql-language';
import type { ESQLIdentifier, ESQLProperNode } from '@kbn/esql-language/src/types';
import type { FieldValue, Params } from '../types';

type ReplaceableNodes = ESQLParamLiteral | ESQLLiteral | ESQLColumn | ESQLFunction;
export class ParameterReplacer {
  private parametersMap: Record<string, FieldValue> = {};
  private positionalIndex = 0;

  constructor(params?: Params) {
    this.parametersMap = this.buildParametersMap(params);
  }

  private buildParametersMap(params?: Params): Record<string, FieldValue> {
    const map: Record<string, FieldValue> = {};
    if (!params) {
      return map;
    }

    let index = 0;
    const list = Array.isArray(params) ? params : [params];

    for (const param of list) {
      if (typeof param === 'object' && param !== null) {
        for (const [key, value] of Object.entries(param)) {
          map[key.toLowerCase()] = value as FieldValue;
        }
      } else {
        map[String(index++)] = param;
      }
    }

    return map;
  }

  public shouldReplaceNode(node: ReplaceableNodes): boolean {
    if (isFunctionExpression(node)) {
      return node.name.startsWith('?');
    }
    if (isColumn(node)) {
      return node.args.some((arg) => isParamLiteral(arg));
    }

    return isParamLiteral(node);
  }

  public replace<TNode extends ReplaceableNodes>(node: TNode, parent?: ESQLProperNode): TNode {
    if (!this.shouldReplaceNode(node)) {
      return node;
    }

    if (isFunctionExpression(node)) {
      return this.replaceFunctionExpression(node) as TNode;
    }

    if (isColumn(node)) {
      return this.replaceColumnExpression(node) as TNode;
    }

    return this.buildReplacementAstNode(node, parent) as TNode;
  }

  private replaceFunctionExpression(node: ESQLFunction): ESQLFunction {
    const funcName = this.resolveFunctionName(node);
    return funcName
      ? Builder.expression.func.node({
          ...node,
          name: funcName,
        })
      : node;
  }

  private replaceColumnExpression(node: ESQLColumn, parent?: ESQLProperNode): ESQLColumn {
    return Builder.expression.column({
      ...node,
      args: node.args.flatMap((arg) =>
        isParamLiteral(arg) ? (this.buildReplacementAstNode(arg, parent) as ESQLIdentifier) : arg
      ),
    });
  }

  private resolveParamValue(node: ESQLParamLiteral): FieldValue | undefined {
    switch (node.paramType) {
      case 'named':
      case 'positional':
        return this.parametersMap[String(node.value).toLowerCase()];
      default:
        return this.parametersMap[this.positionalIndex++];
    }
  }

  private buildReplacementAstNode(
    node: ESQLParamLiteral | ESQLLiteral,
    parent?: ESQLProperNode
  ): ESQLAstBaseItem | ESQLAstBaseItem[] {
    if (!isParamLiteral(node)) {
      return node;
    }

    const value = this.resolveParamValue(node);

    if (value === null || value === undefined) {
      return node;
    }

    if (node.paramKind === '??') {
      return String(value)
        .split('.')
        .map((name) => Builder.identifier({ name }));
    }

    if (
      parent &&
      node.paramKind === '?' &&
      isFunctionExpression(parent) &&
      parent.subtype === 'variadic-call'
    ) {
      if (parent.name === 'bucket' && node.type === 'literal') {
        return Builder.expression.literal.string(String(value), {
          unquoted: String(value).match(/^now\(\)/i) !== null,
        });
      }

      return Builder.identifier(String(value));
    }

    return this.buildLiteral(value);
  }

  private resolveFunctionName(node: ESQLFunction): string {
    const paramKey = node.name.replace(/^\?{1,2}/, '').toLocaleLowerCase();
    const paramValue = this.parametersMap[paramKey];

    return paramValue !== undefined ? String(paramValue) : node.name;
  }

  private buildLiteral(value: FieldValue): ESQLAstBaseItem {
    if (value === null) {
      return Builder.expression.literal.nil();
    }

    switch (typeof value) {
      case 'number':
        return Builder.expression.literal.numeric({
          value,
          literalType: Number.isInteger(value) ? 'integer' : 'double',
        });
      default:
        return Builder.expression.literal.string(String(value));
    }
  }
}
