/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryBuilder } from '../builder';
import { ChainedCommand, NamedParameterWithIdentifier } from '../types';
import { formatColumn } from '../utils/formatters';
import { where } from './where';

const STATS = 'STATS';

type StatsAfterWhere = Omit<StatsBuilder, 'where'>;
type StatsAfterBy = Omit<StatsBuilder, 'where' | 'by' | 'concat'>;
class StatsBuilder extends QueryBuilder {
  private constructor(body: string, params?: NamedParameterWithIdentifier) {
    super();
    this.commands.push({ command: body, params, type: STATS });
  }

  public static create(body: string, params?: NamedParameterWithIdentifier) {
    return new StatsBuilder(body, params);
  }

  public concat(body: string, params?: NamedParameterWithIdentifier) {
    this.commands.push({ command: body, params, type: STATS });
    return this;
  }

  public by(column: string | string[], params?: NamedParameterWithIdentifier) {
    this.commands.push({
      command: (Array.isArray(column) ? column : [column])
        .map((columnName) => formatColumn(columnName))
        .join(', '),
      params,
      type: 'BY',
    });

    return this as StatsAfterBy;
  }

  public where(...args: Parameters<typeof where>) {
    this.commands.push({
      command: () => where(...args),
      type: 'WHERE',
    });

    return this as StatsAfterWhere;
  }

  public build(): ChainedCommand {
    const { command, params } = this.buildChain();

    return {
      command: `${STATS} ${command.replace(/\s+STATS/g, ',')}`,
      params,
    };
  }
}

export function stats(body: string, params?: NamedParameterWithIdentifier) {
  return StatsBuilder.create(body, params);
}
