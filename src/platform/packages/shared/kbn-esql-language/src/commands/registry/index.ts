/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommandRegistry } from './registry';
import { limitCommand } from './limit';
import { dropCommand } from './drop';
import { keepCommand } from './keep';
import { forkCommand } from './fork';
import { renameCommand } from './rename';
import { changePointCommand } from './change_point';
import { completionCommand } from './completion';
import { dissectCommand } from './dissect';
import { enrichCommand } from './enrich';
import { evalCommand } from './eval';
import { fromCommand } from './from';
import { grokCommand } from './grok';
import { joinCommand } from './join';
import { mvExpandCommand } from './mv_expand';
import { rowCommand } from './row';
import { sortCommand } from './sort';
import { statsCommand } from './stats';
import { inlineStatsCommand } from './inlinestats';
import { sampleCommand } from './sample';
import { showCommand } from './show';
import { timeseriesCommand } from './timeseries';
import { whereCommand } from './where';
import { fuseCommand } from './fuse';
import { rerankCommand } from './rerank';
import { promqlCommand } from './promql';
import { mergeCommandWithGeneratedCommandData } from './elastisearch_command_data_loader';
import { setCommand } from './set';

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
  promqlCommand,
];

baseCommands.forEach((command) => {
  const mergedCommand = mergeCommandWithGeneratedCommandData(command);
  esqlCommandRegistry.registerCommand(mergedCommand);
});

export { esqlCommandRegistry };
