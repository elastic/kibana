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
import { sampleCommand } from './commands/sample';
import { showCommand } from './commands/show';
import { timeseriesCommand } from './commands/timeseries';
import { whereCommand } from './commands/where';
import { rrfCommand } from './commands/rrf';

const esqlCommandRegistry = new CommandRegistry();

esqlCommandRegistry.registerCommand(limitCommand);
esqlCommandRegistry.registerCommand(dropCommand);
esqlCommandRegistry.registerCommand(forkCommand);
esqlCommandRegistry.registerCommand(renameCommand);
esqlCommandRegistry.registerCommand(changePointCommand);
esqlCommandRegistry.registerCommand(completionCommand);
esqlCommandRegistry.registerCommand(dissectCommand);
esqlCommandRegistry.registerCommand(enrichCommand);
esqlCommandRegistry.registerCommand(evalCommand);
esqlCommandRegistry.registerCommand(fromCommand);
esqlCommandRegistry.registerCommand(grokCommand);
esqlCommandRegistry.registerCommand(joinCommand);
esqlCommandRegistry.registerCommand(mvExpandCommand);
esqlCommandRegistry.registerCommand(keepCommand);
esqlCommandRegistry.registerCommand(rowCommand);
esqlCommandRegistry.registerCommand(sortCommand);
esqlCommandRegistry.registerCommand(statsCommand);
esqlCommandRegistry.registerCommand(sampleCommand);
esqlCommandRegistry.registerCommand(showCommand);
esqlCommandRegistry.registerCommand(timeseriesCommand);
esqlCommandRegistry.registerCommand(whereCommand);
esqlCommandRegistry.registerCommand(rrfCommand);

export { esqlCommandRegistry };
