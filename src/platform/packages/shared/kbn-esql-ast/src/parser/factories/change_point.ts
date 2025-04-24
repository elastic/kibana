/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChangePointCommandContext } from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLAstChangePointCommand } from '../../types';
import { createColumn, createCommand } from '../factories';
import { getPosition } from '../helpers';

export const createChangePointCommand = (
  ctx: ChangePointCommandContext
): ESQLAstChangePointCommand => {
  const value = createColumn(ctx._value);
  const command = createCommand<'change_point', ESQLAstChangePointCommand>('change_point', ctx, {
    value,
  });

  command.args.push(value);

  if (ctx._key && ctx._key.getText()) {
    const key = createColumn(ctx._key);
    const option = Builder.option(
      {
        name: 'on',
        args: [key],
      },
      {
        location: getPosition(ctx.ON().symbol, ctx._key.stop),
      }
    );

    command.key = key;
    command.args.push(option);
  }

  if (ctx._targetType && ctx._targetPvalue) {
    const type = createColumn(ctx._targetType);
    const pvalue = createColumn(ctx._targetPvalue);
    const option = Builder.option(
      {
        name: 'as',
        args: [type, pvalue],
      },
      {
        location: getPosition(ctx.AS().symbol, ctx._targetPvalue.stop),
      }
    );

    command.target = {
      type,
      pvalue,
    };
    command.args.push(option);
  }

  return command;
};
