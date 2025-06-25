/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParserRuleContext } from 'antlr4';
import {
  RerankCommandContext,
  RerankFieldContext,
  RerankFieldsContext,
} from '../../antlr/esql_parser';
import { AstNodeParserFields, Builder } from '../../builder';
import { ESQLAstField, ESQLAstRerankCommand } from '../../types';
import { firstItem, resolveItem } from '../../visitor/utils';
import { createColumn, createCommand } from '../factories';
import { getPosition } from '../helpers';
import { collectBooleanExpression, getConstant } from '../walkers';

const parserFieldsFromCtx = (ctx: ParserRuleContext): AstNodeParserFields => {
  const min: number = ctx.start.start;
  const max: number = ctx.stop?.stop ?? ctx.start.stop;

  return {
    text: ctx.getText(),
    location: { min, max },
    incomplete: Boolean(ctx.exception),
  };
};

const visitRerankField = (ctx: RerankFieldContext): ESQLAstField => {
  const columnCtx = ctx.qualifiedName();
  const column = createColumn(columnCtx);
  const assignCtx = ctx.ASSIGN();

  if (assignCtx) {
    const booleanExpression = firstItem(collectBooleanExpression(ctx.booleanExpression()));
    const assignment = Builder.expression.func.binary(
      '=',
      [column, booleanExpression!],
      {},
      parserFieldsFromCtx(ctx)
    );

    return assignment;
  }

  return column;
};

const visitRerankFields = (ctx: RerankFieldsContext | undefined): ESQLAstField[] => {
  const ast: ESQLAstField[] = [];

  if (!ctx) {
    return ast;
  }

  for (const fieldCtx of ctx.rerankField_list()) {
    const field = visitRerankField(fieldCtx);

    ast.push(field);
  }

  return ast;
};

export const createRerankCommand = (ctx: RerankCommandContext): ESQLAstRerankCommand => {
  const query = resolveItem(getConstant(ctx._queryText)) as ESQLAstRerankCommand['query'];
  const fieldsCtx = ctx.rerankFields();
  const fields = visitRerankFields(fieldsCtx);

  /**
   * @todo Parse out correctly "inference command options" once grammar for the RERANK
   * command is stabilized. Currently, we comment out `inferenceId` parsing to get
   * the latest grammar merged, while RERANK command will not make it to 9.1 anyways.
   */

  // const inferenceIdCtx = ctx._inferenceId;
  const inferenceCommandOptions = ctx.inferenceCommandOptions();
  // const maybeInferenceId = inferenceIdCtx ? createIdentifierOrParam(inferenceIdCtx) : undefined;
  // const inferenceId = maybeInferenceId ?? Builder.identifier('', { incomplete: true });

  const inferenceId = Builder.identifier('', { incomplete: true });
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
    withCtx && inferenceCommandOptions
      ? {
          location: getPosition(withCtx.symbol, inferenceCommandOptions.stop),
        }
      : undefined
  );

  if (query.incomplete || inferenceId.incomplete || !onCtx) {
    command.incomplete = true;
  }

  command.args.push(query, optionOn, optionWith);

  return command;
};
