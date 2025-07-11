/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import esql_parser, { CommandOptionsContext, DissectCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand, ESQLCommandOption } from '../../types';
import {
  createCommand,
  createLiteralString,
  createOption,
  sanitizeIdentifierString,
  textExistsAndIsValid,
} from '../factories';
import { getConstant, visitPrimaryExpression } from '../walkers';

const createDissectOptions = (ctx: CommandOptionsContext | undefined): ESQLCommandOption[] => {
  if (!ctx) {
    return [];
  }

  const options: ESQLCommandOption[] = [];

  for (const optionCtx of ctx.commandOption_list()) {
    const option = createOption(
      sanitizeIdentifierString(optionCtx.identifier()).toLowerCase(),
      optionCtx
    );
    options.push(option);
    // it can throw while accessing constant for incomplete commands, so try catch it
    try {
      const optionValue = getConstant(optionCtx.constant());
      if (optionValue != null) {
        option.args.push(optionValue);
      }
    } catch (e) {
      // do nothing here
    }
  }

  return options;
};

export const createDissectCommand = (ctx: DissectCommandContext): ESQLCommand<'dissect'> => {
  const command = createCommand('dissect', ctx);
  const primaryExpression = visitPrimaryExpression(ctx.primaryExpression());
  const stringContext = ctx.string_();
  const pattern = stringContext.getToken(esql_parser.QUOTED_STRING, 0);
  const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

  command.args.push(primaryExpression);

  if (doParseStringAndOptions) {
    const stringNode = createLiteralString(stringContext);

    command.args.push(stringNode);
    command.args.push(...createDissectOptions(ctx.commandOptions()));
  }

  return command;
};
