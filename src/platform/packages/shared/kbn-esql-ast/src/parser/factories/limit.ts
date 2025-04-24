/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import esql_parser, { LimitCommandContext } from '../../antlr/esql_parser';
import { createCommand, createLiteral } from '../factories';

export const createLimitCommand = (ctx: LimitCommandContext) => {
  const command = createCommand('limit', ctx);
  if (ctx.getToken(esql_parser.INTEGER_LITERAL, 0)) {
    const literal = createLiteral('integer', ctx.INTEGER_LITERAL());
    if (literal) {
      command.args.push(literal);
    }
  }

  return command;
};
