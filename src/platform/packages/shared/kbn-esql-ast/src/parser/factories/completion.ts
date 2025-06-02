/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, ESQLCommand } from '../../..';
import { visitPrimaryExpression } from '../walkers';
import { CompletionCommandContext } from '../../antlr/esql_parser';
import { createColumn, createCommand, createIdentifierOrParam } from '../factories';
import { getPosition } from '../helpers';

export const createCompletionCommand = (
  ctx: CompletionCommandContext
): ESQLCommand<'completion'> => {
  const command = createCommand<'completion'>('completion', ctx);

  const prompt = visitPrimaryExpression(ctx._prompt);
  command.args.push(prompt);

  const inferenceIdCtx = ctx._inferenceId;
  const maybeInferenceId = inferenceIdCtx ? createIdentifierOrParam(inferenceIdCtx) : undefined;
  const inferenceId = maybeInferenceId ?? Builder.identifier('', { incomplete: true });

  const withCtx = ctx.WITH();
  const optionWith = Builder.option(
    {
      name: 'with',
      args: [inferenceId],
    },
    withCtx && inferenceIdCtx
      ? {
          location: getPosition(withCtx.symbol, inferenceIdCtx.stop),
        }
      : undefined
  );

  if (inferenceId.incomplete || !withCtx) {
    optionWith.incomplete = true;
  }

  command.args.push(optionWith);

  if (ctx._targetField && ctx._targetField.getText()) {
    const targetField = createColumn(ctx._targetField);
    const option = Builder.option(
      {
        name: 'as',
        args: [targetField],
      },
      {
        location: getPosition(ctx.AS().symbol, ctx._targetField.stop),
      }
    );

    command.args.push(option);
  }

  return command;
};
