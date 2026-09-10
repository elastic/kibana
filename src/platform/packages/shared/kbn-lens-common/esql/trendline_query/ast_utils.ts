/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, isOptionNode } from '@elastic/esql';
import type { ESQLAstItem, ESQLCommand, ESQLCommandOption } from '@elastic/esql/types';

/** Finds the STATS command in a list of AST commands. */
export const findStatsCommand = (commands: ESQLCommand[]): ESQLCommand => {
  const cmd = commands.find((c): c is ESQLCommand<'stats'> => c.name === 'stats');
  if (!cmd) throw new Error('Expected STATS command in parsed AST');
  return cmd;
};

/** Finds the BY option within a STATS command's args. */
export const findByOption = (statsCmd: ESQLCommand): ESQLCommandOption => {
  const option = statsCmd.args.find(isOptionNode);
  if (!option) throw new Error('Expected BY option in STATS command');
  return option;
};

/**
 * Parses a BUCKET expression into an AST node by extracting it from a helper query.
 */
export const parseBucketNode = (bucketExpr: string): ESQLAstItem => {
  const { root } = Parser.parse(`FROM _x | STATS _x BY ${bucketExpr}`);
  const statsCmd = findStatsCommand(root.commands);
  const byOption = findByOption(statsCmd);
  return byOption.args[0];
};
