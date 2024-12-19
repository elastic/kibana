/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryBuilder } from '../builder';
import { Params, FieldValue, ChainedCommand } from '../types';

const operators = ['==', '>', '<', '!=', '>=', '<='] as const;

const WHERE = 'WHERE';

type WhereCriteria = string | (() => WhereBuilder) | Record<string, FieldValue>;
type Operators = (typeof operators)[number];
type LogicalOperator = 'AND' | 'OR';

function isOperator(value?: Params | Operators): value is Operators {
  return !!value && operators.includes(value as Operators);
}

class WhereBuilder extends QueryBuilder {
  private constructor(
    criteria: WhereCriteria,
    operatorOrBindings?: Operators | Params,
    params?: Params
  ) {
    super();
    this.push(criteria, operatorOrBindings, params);
  }

  public static create(
    criteria: WhereCriteria,
    operatorOrBindings?: Operators | Params,
    params?: Params
  ) {
    return new WhereBuilder(criteria, operatorOrBindings, params);
  }

  public and(
    criteria: WhereCriteria,
    operatorOrParams?: Operators | Params,
    bindings?: Params
  ): WhereBuilder {
    return this.addCondition('AND', criteria, operatorOrParams, bindings);
  }

  public or(
    criteria: WhereCriteria,
    operatorOrParams?: Operators | Params,
    bindings?: Params
  ): WhereBuilder {
    return this.addCondition('OR', criteria, operatorOrParams, bindings);
  }

  public build(): ChainedCommand {
    const { command, bindings } = this.buildChain();

    return {
      command: `${WHERE} ${command}`,
      bindings,
    };
  }

  private addCondition(
    logicalOperator: LogicalOperator,
    body: WhereCriteria,
    operatorOrParams?: Operators | Params,
    bindings?: Params
  ): WhereBuilder {
    return this.push(body, operatorOrParams, bindings, logicalOperator);
  }

  private push(
    criteria: WhereCriteria,
    operatorOrBindings?: Operators | Params,
    params?: Params,
    type: LogicalOperator | typeof WHERE = 'WHERE'
  ) {
    if (typeof criteria === 'function') {
      // Handle nested conditions
      this.commands.push({
        command: criteria,
        type,
        nested: true,
      });
    } else if (typeof criteria === 'object') {
      // Handle object with named parameters
      const keys = Object.keys(criteria);
      this.commands.push({
        command: keys.map((key) => `${key} == ?`).join(' AND '),
        bindings: keys.map((key) => criteria[key]),
        type,
      });
    } else if (
      !Array.isArray(operatorOrBindings) &&
      isOperator(operatorOrBindings) &&
      params !== undefined
    ) {
      // Handle explicit operator and parameter
      const operator = operatorOrBindings;
      this.commands.push({
        command: `${criteria} ${operator} ?`,
        bindings: params,
        type,
      });
    } else {
      // Handle raw and nested conditions
      const bindings = operatorOrBindings;
      this.commands.push({
        command: criteria,
        bindings,
        type,
      });
    }

    return this;
  }
}

export function where(
  criteria: WhereCriteria,
  operatorOrParams?: Operators | Params,
  bindings?: Params
): WhereBuilder {
  return WhereBuilder.create(criteria, operatorOrParams, bindings);
}
