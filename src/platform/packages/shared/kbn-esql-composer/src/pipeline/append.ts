/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth, Builder } from '@kbn/esql-ast';
import type { QueryOperator, Params, Query } from '../types';

export function append({
  command,
  params,
  comment,
}: {
  command: string;
  params?: Params;
  comment?: string;
}): QueryOperator {
  return (source): Query => {
    const commandAst = synth.cmd(command);

    // Attach comment to the command if provided
    if (comment) {
      const commentNode = Builder.comment('single-line', ` ${comment}`);
      commandAst.formatting = {
        top: [commentNode],
      };
    }

    return {
      root: source.root,
      commands: source.commands.concat(commandAst),
      params: params
        ? source.params.concat(Array.isArray(params) ? params : [params])
        : source.params,
    };
  };
}
