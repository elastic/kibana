/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggFieldContext, StatsCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand, ESQLField } from '../../types';
import { createCommand } from '../factories';
import { createField, visitByOption } from '../walkers';

const createAggField = (ctx: AggFieldContext, src: string): ESQLField => {
  const fieldCtx = ctx.field();
  const field = createField(fieldCtx, src);

  return field;
};

export const createStatsCommand = (ctx: StatsCommandContext, src: string): ESQLCommand<'stats'> => {
  const command = createCommand('stats', ctx);

  if (ctx._stats) {
    const fields = ctx.aggFields();

    for (const fieldCtx of fields.aggField_list()) {
      const node = createAggField(fieldCtx, src);

      command.args.push(node);
    }
  }

  if (ctx._grouping) {
    const options = visitByOption(ctx, ctx.fields());

    command.args.push(...options);
  }

  return command;
};
