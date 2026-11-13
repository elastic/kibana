/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CommandFacts } from './types';

/**
 * What the grammar leaves open about a command and Elasticsearch requires, by the rule of the
 * command.
 */
export const COMMAND_FACTS: Readonly<Record<string, CommandFacts>> = {
  // `STATS aggFields? (BY fields)?`: at least an aggregation or a grouping is needed.
  statsCommand: { requiresArgument: true },
  // `(fuseConfiguration)*`: Elasticsearch rejects a second `SCORE BY`.
  fuseCommand: { singleUse: ['fuseCommand>fuseConfiguration'] },
};

/**
 * Commands of the grammar that have no signature yet, with why. Their places get the default
 * roles. An entry goes when the command is described.
 */
export const UNDESCRIBED_COMMANDS: Readonly<Record<string, string>> = {
  describeCommand: 'development only',
  explainCommand: 'development only',
  externalCommand: 'development only',
  fillNullCommand: 'development only; not adopted yet',
  lookupCommand: 'development only',
  tsCollapseCommand: 'not adopted yet',
};
