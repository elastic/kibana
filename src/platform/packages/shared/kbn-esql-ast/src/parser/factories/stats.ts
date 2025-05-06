/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggFieldContext, FieldContext, StatsCommandContext } from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLCommand } from '../../types';
import { firstItem, resolveItem } from '../../visitor/utils';
import { createCommand } from '../factories';
import { collectBooleanExpression, visitByOption, visitField } from '../walkers';

const createField = (ctx: FieldContext) => visitField(ctx)[0];

const createAggField = (ctx: AggFieldContext) => {
  const fieldCtx = ctx.field();
  const field = createField(fieldCtx);

  const booleanExpression = ctx.booleanExpression();

  if (!booleanExpression) {
    return field;
  }

  const condition = collectBooleanExpression(booleanExpression)[0];
  const aggField = Builder.expression.where(
    [field, condition],
    {},
    {
      location: {
        min: firstItem([resolveItem(field)])?.location?.min ?? 0,
        max: firstItem([resolveItem(condition)])?.location?.max ?? 0,
      },
    }
  );

  return aggField;
};

export const createStatsCommand = (ctx: StatsCommandContext): ESQLCommand<'stats'> => {
  const command = createCommand('stats', ctx);

  if (ctx._stats) {
    const fields = ctx.aggFields();

    for (const fieldCtx of fields.aggField_list()) {
      if (fieldCtx.getText() === '') continue;

      const node = createAggField(fieldCtx);

      command.args.push(node);
    }
  }

  if (ctx._grouping) {
    const options = visitByOption(ctx, ctx.fields());

    command.args.push(...options);
  }

  return command;
};
