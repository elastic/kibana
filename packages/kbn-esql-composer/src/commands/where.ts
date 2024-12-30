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
import { formatColumn } from '../utils/formatters';

const WHERE = 'WHERE';

type WhereCriteria = string | (() => WhereBuilder) | Record<string, FieldValue>;
type LogicalOperator = 'AND' | 'OR';

class WhereBuilder extends QueryBuilder {
  private constructor(criteria: WhereCriteria, params?: Params) {
    super();
    this.push(criteria, params);
  }

  public static create(criteria: WhereCriteria, params?: Params) {
    return new WhereBuilder(criteria, params);
  }

  public and(criteria: WhereCriteria, params?: Params): WhereBuilder {
    return this.addCondition('AND', criteria, params);
  }

  public or(criteria: WhereCriteria, params?: Params): WhereBuilder {
    return this.addCondition('OR', criteria, params);
  }

  public build(): ChainedCommand {
    const { command, params } = this.buildChain();

    return {
      command: `${WHERE} ${command}`,
      params,
    };
  }

  private addCondition(
    logicalOperator: LogicalOperator,
    body: WhereCriteria,
    params?: Params
  ): WhereBuilder {
    return this.push(body, params, logicalOperator);
  }

  private push(
    criteria: WhereCriteria,
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
        command: keys.map((key) => `${formatColumn(key)} == ?`).join(' AND '),
        params: keys.map((key) => criteria[key]),
        type,
      });
    } else {
      // Handle raw and nested conditions
      this.commands.push({
        command: criteria,
        params,
        type,
      });
    }

    return this;
  }
}

export function where(criteria: WhereCriteria, params?: Params): WhereBuilder {
  return WhereBuilder.create(criteria, params);
}
