/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Builder,
  ESQLAstBaseItem,
  ESQLColumn,
  ESQLFunction,
  ESQLLiteral,
  ESQLParamLiteral,
  isColumn,
  isFunctionExpression,
  isParamLiteral,
} from '@kbn/esql-ast';
import { ESQLAstExpressionNode } from '@kbn/esql-ast/src/visitor';
import { ESQLIdentifier } from '@kbn/esql-ast/src/types';
import { FieldValue, Params } from '../types';

type ReplaceableNodes = ESQLParamLiteral | ESQLLiteral | ESQLColumn | ESQLFunction;
export class ParameterReplacer {
  private parametersMap: Record<string, FieldValue> = {};
  private positionalIndex = 0;

  constructor(params?: Params) {
    this.parametersMap = this.buildParametersMap(params);
  }

  private buildParametersMap(params?: Params): Record<string, FieldValue> {
    const map: Record<string, FieldValue> = {};
    const list = Array.isArray(params) ? params : params ? [params] : [];
    let index = 0;

    for (const param of list) {
      if (typeof param === 'object' && param !== null) {
        Object.assign(map, param);
      } else {
        map[String(index++)] = param;
      }
    }
    return map;
  }

  public maybeReplace<TNode extends ReplaceableNodes>(node: TNode): TNode {
    if (isFunctionExpression(node)) {
      return this.replaceFunctionExpression(node) as TNode;
    }

    if (isColumn(node)) {
      return this.replaceColumnExpression(node) as TNode;
    }

    if (this.isNamedOrIndexParameterLiteral(node)) {
      return this.buildReplacementAstNode(node) as TNode;
    }

    return node;
  }
  private isNamedOrIndexParameterLiteral(node: ESQLAstExpressionNode): node is ESQLParamLiteral {
    return (
      isParamLiteral(node) &&
      (node.paramType === 'named' ||
        node.paramType === 'positional' ||
        node.paramType === 'unnamed')
    );
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

  private replaceColumnExpression(node: ESQLColumn): ESQLColumn {
    if (!node.args.some((arg) => this.isNamedOrIndexParameterLiteral(arg))) {
      return node;
    }

    return Builder.expression.column({
      ...node,
      args: node.args.map((arg) =>
        this.isNamedOrIndexParameterLiteral(arg)
          ? (this.buildReplacementAstNode(arg) as ESQLIdentifier)
          : arg
      ),
    });
  }

  private resolveParamValue(node: ESQLParamLiteral): FieldValue | undefined {
    switch (node.paramType) {
      case 'named':
      case 'positional':
        return this.parametersMap[node.value];
      default:
        return this.parametersMap[this.positionalIndex++];
    }
  }

  private buildReplacementAstNode(node: ESQLParamLiteral): ESQLAstBaseItem {
    const value = this.resolveParamValue(node);

    if (!value) {
      return node;
    }

    if (node.paramKind === '??') {
      return Builder.identifier(String(value));
    }

    return this.buildLiteral(value);
  }

  private resolveFunctionName(node: ESQLFunction): string {
    if (!node.name.startsWith('?')) {
      return node.name;
    }

    const paramKey = node.name.replace(/^\?{1,2}/, '');
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
