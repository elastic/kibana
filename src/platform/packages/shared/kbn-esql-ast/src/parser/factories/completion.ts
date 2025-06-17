/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLAstCompletionCommand, ESQLSingleAstItem } from '../../types';
import { Builder } from '../../..';
import { visitPrimaryExpression } from '../walkers';
import { CompletionCommandContext } from '../../antlr/esql_parser';
import { createColumn, createCommand, createIdentifierOrParam } from '../factories';
import { getPosition } from '../helpers';
import { EDITOR_MARKER } from '../constants';

export const createCompletionCommand = (
  ctx: CompletionCommandContext
): ESQLAstCompletionCommand => {
  const command = createCommand<'completion', ESQLAstCompletionCommand>('completion', ctx);

  const prompt = visitPrimaryExpression(ctx._prompt) as ESQLSingleAstItem;
  command.args.push(prompt);
  command.prompt = prompt;

  const withCtx = ctx.WITH();

  let inferenceId: ESQLSingleAstItem;
  let withIncomplete = true;

  const withText = withCtx?.getText();
  const inferenceIdText = ctx._inferenceId?.getText();
  if (withText?.includes('missing') && /(?:w|wi|wit|with)$/i.test(inferenceIdText)) {
    // This case is when the WITH keyword is partially typed, and no inferenceId has been provided e.g. 'COMPLETION "prompt" WI'
    // (the parser incorrectly recognizes the partial WITH keyword as the inferenceId)
    inferenceId = Builder.identifier('', { incomplete: true });
  } else {
    if (!inferenceIdText) {
      inferenceId = Builder.identifier('', { incomplete: true });
    } else {
      withIncomplete = false;
      inferenceId = createIdentifierOrParam(ctx._inferenceId)!;
    }
  }

  command.inferenceId = inferenceId;

  const optionWith = Builder.option(
    {
      name: 'with',
      args: [inferenceId],
    },
    {
      incomplete: withIncomplete,
      ...(withCtx && ctx._inferenceId
        ? {
            location: getPosition(withCtx.symbol, ctx._inferenceId.stop),
          }
        : undefined),
    }
  );

  command.args.push(optionWith);

  if (ctx._targetField) {
    const targetField = createColumn(ctx._targetField);
    targetField.incomplete =
      targetField.text.length === 0 || targetField.text.includes(EDITOR_MARKER);

    const option = Builder.option(
      {
        name: 'as',
        args: [targetField],
      },
      {
        incomplete: targetField.incomplete,
        location: getPosition(ctx.AS().symbol, ctx._targetField.stop),
      }
    );

    command.args.push(option);
    command.targetField = targetField;
  }

  return command;
};
