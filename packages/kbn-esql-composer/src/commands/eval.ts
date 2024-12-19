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
  private constructor(body: string, bindings?: Params) {
    super();
    this.commands.push({ command: body, bindings, type: EVAL });
  }

  public static create(body: string, bindings?: Params) {
    return new EvalBuilder(body, bindings);
  }

  public concat(body: string, bindings?: Params) {
    this.commands.push({ command: body, bindings, type: EVAL });
    return this;
  }

  public build(): ChainedCommand {
    const { command, bindings } = this.buildChain();

    return {
      command: `${EVAL} ${command.replace(/\s+EVAL/g, ',')}`,
      bindings,
    };
  }
}

export function evaluate(body: string, bindings?: Params) {
  return EvalBuilder.create(body, bindings);
}
