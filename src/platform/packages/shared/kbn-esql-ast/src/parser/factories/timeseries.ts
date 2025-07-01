/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeSeriesCommandContext, IndexPatternContext } from '../../antlr/esql_parser';
import { ESQLCommand } from '../../types';
import { createCommand, createOption, visitSource } from '../factories';
import { collectAllColumnIdentifiers } from '../walkers';

export const createTimeseriesCommand = (ctx: TimeSeriesCommandContext): ESQLCommand<'ts'> => {
  const command = createCommand('ts', ctx);
  const indexPatternCtx = ctx.indexPatternAndMetadataFields();
  const metadataCtx = indexPatternCtx.metadata();
  const sources = indexPatternCtx
    .getTypedRuleContexts(IndexPatternContext)
    .map((sourceCtx) => visitSource(sourceCtx));

  command.args.push(...sources);

  if (metadataCtx && metadataCtx.METADATA()) {
    const name = metadataCtx.METADATA().getText().toLowerCase();
    const option = createOption(name, metadataCtx);
    const optionArgs = collectAllColumnIdentifiers(metadataCtx);

    option.args.push(...optionArgs);
    command.args.push(option);
  }

  return command;
};
