/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RerankCommandContext } from '../../antlr/esql_parser';
import { Builder } from '../../builder';
import { ESQLAstRerankCommand } from '../../types';
import { resolveItem } from '../../visitor/utils';
import { createCommand, createIdentifierOrParam } from '../factories';
import { getPosition } from '../helpers';
import { collectAllFields, getConstant } from '../walkers';

export const createRerankCommand = (ctx: RerankCommandContext): ESQLAstRerankCommand => {
  const query = resolveItem(getConstant(ctx._queryText)) as ESQLAstRerankCommand['query'];
  const fieldsCtx = ctx.fields();
  const fields = collectAllFields(fieldsCtx);
  const inferenceIdCtx = ctx._inferenceId;
  const maybeInferenceId = inferenceIdCtx ? createIdentifierOrParam(inferenceIdCtx) : undefined;
  const inferenceId = maybeInferenceId ?? Builder.identifier('', { incomplete: true });
  const command = createCommand<'rerank', ESQLAstRerankCommand>('rerank', ctx, {
    query,
    fields,
    inferenceId,
  });
  const onCtx = ctx.ON();
  const optionOn = Builder.option(
    {
      name: 'on',
      args: fields,
    },
    onCtx && fieldsCtx
      ? {
          location: getPosition(onCtx.symbol, fieldsCtx.stop),
        }
      : undefined
  );
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

  if (query.incomplete || inferenceId.incomplete || !onCtx || !withCtx) {
    command.incomplete = true;
  }

  command.args.push(query, optionOn, optionWith);

  return command;
};
