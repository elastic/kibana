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
import { where } from './where';

const STATS = 'STATS';

type StatsAfterWhere = Omit<StatsBuilder, 'where'>;
type StatsAfterBy = Omit<StatsBuilder, 'where' | 'by' | 'concat'>;
class StatsBuilder extends QueryBuilder {
  private constructor(body: string, bindings?: NamedParameterWithIdentifier) {
    super();
    this.commands.push({ command: body, bindings, type: STATS });
  }

  public static create(body: string, bindings?: NamedParameterWithIdentifier) {
    return new StatsBuilder(body, bindings);
  }

  public concat(body: string, bindings?: NamedParameterWithIdentifier) {
    this.commands.push({ command: body, bindings, type: STATS });
    return this;
  }

  public by(criteria: string | string[], bindings?: NamedParameterWithIdentifier) {
    this.commands.push({
      command: Array.isArray(criteria) ? criteria.join(', ') : criteria,
      bindings,
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
    const { command, bindings } = this.buildChain();

    return {
      command: `${STATS} ${command.replace(/\s+STATS/g, ',')}`,
      bindings,
    };
  }
}

export function stats(body: string, bindings?: NamedParameterWithIdentifier) {
  return StatsBuilder.create(body, bindings);
}
