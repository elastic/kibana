/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryBuilder } from '../builder';
import { ChainedCommand, Params } from '../types';

const EVAL = 'EVAL';

class EvalBuilder extends QueryBuilder {
  private constructor(body: string, params?: Params) {
    super();
    this.commands.push({ command: body, params, type: EVAL });
  }

  public static create(body: string, params?: Params) {
    return new EvalBuilder(body, params);
  }

  public concat(body: string, params?: Params) {
    this.commands.push({ command: body, params, type: EVAL });
    return this;
  }

  public build(): ChainedCommand {
    const { command, params } = this.buildChain();

    return {
      command: `${EVAL} ${command.replace(/\s+EVAL/g, ',')}`,
      params,
    };
  }
}

export function evaluate(body: string, params?: Params) {
  return EvalBuilder.create(body, params);
}
