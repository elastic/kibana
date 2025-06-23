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
import {
  computeLocationExtends,
  createColumn,
  createCommand,
  createFunction,
  createIdentifierOrParam,
  createUnknownItem,
} from '../factories';
import { getPosition } from '../helpers';

export const createCompletionCommand = (
  ctx: CompletionCommandContext
): ESQLAstCompletionCommand => {
  const command = createCommand<'completion', ESQLAstCompletionCommand>('completion', ctx);

  if (ctx._targetField && ctx.ASSIGN()) {
    const targetField = createColumn(ctx._targetField);

    const prompt = visitPrimaryExpression(ctx._prompt) as ESQLSingleAstItem;
    command.prompt = prompt;

    const assignment = createFunction(ctx.ASSIGN().getText(), ctx, undefined, 'binary-expression');
    assignment.args.push(targetField, prompt);
    // update the location of the assign based on arguments
    assignment.location = computeLocationExtends(assignment);

    command.targetField = targetField;
    command.args.push(assignment);
  } else if (ctx._prompt) {
    const prompt = visitPrimaryExpression(ctx._prompt) as ESQLSingleAstItem;
    command.prompt = prompt;
    command.args.push(prompt);
  } else {
    // When the user is typing a column as prompt i.e: | COMPLETION message^,
    // ANTLR does not know if it is trying to type a prompt
    // or a target field, so it does not return neither _prompt nor _targetField. We fill the AST
    // with an unknown item until the user inserts the next keyword and breaks the tie.
    const unknownItem = createUnknownItem(ctx);
    unknownItem.text = ctx.getText().replace(/^completion/i, '');

    command.prompt = unknownItem;
    command.args.push(unknownItem);
  }

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

  return command;
};
