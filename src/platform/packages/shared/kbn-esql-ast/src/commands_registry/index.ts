/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommandRegistry } from './registry';
import { limitCommand } from './commands/limit';
import { dropCommand } from './commands/drop';
import { keepCommand } from './commands/keep';
import { forkCommand } from './commands/fork';
import { renameCommand } from './commands/rename';
import { changePointCommand } from './commands/change_point';
import { completionCommand } from './commands/completion';
import { dissectCommand } from './commands/dissect';
import { enrichCommand } from './commands/enrich';
import { evalCommand } from './commands/eval';
import { fromCommand } from './commands/from';
import { grokCommand } from './commands/grok';
import { joinCommand } from './commands/join';
import { mvExpandCommand } from './commands/mv_expand';
import { rowCommand } from './commands/row';
import { sortCommand } from './commands/sort';
import { statsCommand } from './commands/stats';
import { inlineStatsCommand } from './commands/inlinestats';
import { sampleCommand } from './commands/sample';
import { showCommand } from './commands/show';
import { timeseriesCommand } from './commands/timeseries';
import { whereCommand } from './commands/where';
import { fuseCommand } from './commands/fuse';
import { rerankCommand } from './commands/rerank';
import { mergeCommandWithGeneratedCommandData } from './elastisearch_command_data_loader';
import { setCommand } from './commands/set';

const esqlCommandRegistry = new CommandRegistry();

const baseCommands = [
  limitCommand,
  dropCommand,
  forkCommand,
  renameCommand,
  changePointCommand,
  completionCommand,
  dissectCommand,
  enrichCommand,
  evalCommand,
  fromCommand,
  grokCommand,
  joinCommand,
  mvExpandCommand,
  keepCommand,
  rowCommand,
  sortCommand,
  statsCommand,
  inlineStatsCommand,
  sampleCommand,
  setCommand,
  showCommand,
  timeseriesCommand,
  whereCommand,
  fuseCommand,
  rerankCommand,
];

baseCommands.forEach((command) => {
  const mergedCommand = mergeCommandWithGeneratedCommandData(command);
  esqlCommandRegistry.registerCommand(mergedCommand);
});

export { esqlCommandRegistry };
