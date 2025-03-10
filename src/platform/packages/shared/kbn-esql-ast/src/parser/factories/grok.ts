/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import esql_parser, { GrokCommandContext } from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand, createLiteralString, textExistsAndIsValid } from '../factories';
import { visitPrimaryExpression } from '../walkers';

export const createGrokCommand = (ctx: GrokCommandContext): ESQLCommand => {
  const command = createCommand('grok', ctx);
  const primaryExpression = visitPrimaryExpression(ctx.primaryExpression());
  const stringContext = ctx.string_();
  const pattern = stringContext.getToken(esql_parser.QUOTED_STRING, 0);
  const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

  command.args.push(primaryExpression);

  if (doParseStringAndOptions) {
    const stringNode = createLiteralString(stringContext);

    command.args.push(stringNode);
  }

  return command;
};
