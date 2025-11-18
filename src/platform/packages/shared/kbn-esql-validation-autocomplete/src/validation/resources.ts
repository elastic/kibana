/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLPolicy } from '@kbn/esql-ast/src/commands_registry/types';
import type { ESQLAstAllCommands } from '@kbn/esql-ast/src/types';
import { createMapFromList } from '../shared/helpers';
import { getPolicyHelper, getSourcesHelper } from '../shared/resources_helpers';
import type { ESQLCallbacks } from '../shared/types';
import { getEnrichCommands } from './helpers';

export async function retrievePolicies(
  commands: ESQLAstAllCommands[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLPolicy>> {
  const enrichCommands = getEnrichCommands(commands);
  if (!callbacks || !enrichCommands.length) {
    return new Map();
  }

  const policies = await getPolicyHelper(callbacks).getPolicies();
  return createMapFromList(policies);
}

export async function retrieveSources(
  commands: ESQLAstAllCommands[],
  callbacks?: ESQLCallbacks
): Promise<Set<string>> {
  if (!callbacks || commands.length < 1) {
    return new Set();
  }
  if (['row', 'show', 'meta'].includes(commands[0].name)) {
    return new Set();
  }
  const sources = await getSourcesHelper(callbacks)();
  return new Set(sources.map(({ name }) => name));
}
