/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@kbn/esql-ast';
import { QueryOperator, Params, Query } from '../types';

export function append({ command, params }: { command: string; params?: Params }): QueryOperator {
  return (source): Query => {
    const commandAst = synth.cmd`${command}`;

    return {
      root: source.root,
      commands: source.commands.concat(commandAst),
      params: params
        ? source.params.concat(Array.isArray(params) ? params : [params])
        : source.params,
    };
  };
}
