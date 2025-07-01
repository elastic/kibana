/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LimitCommandContext } from '../../antlr/esql_parser';
import { createCommand } from '../factories';
import { getConstant } from '../walkers';

export const createLimitCommand = (ctx: LimitCommandContext) => {
  const command = createCommand('limit', ctx);
  if (ctx.constant()) {
    const limitValue = getConstant(ctx.constant());
    if (limitValue != null) {
      command.args.push(limitValue);
    }
  }

  return command;
};
