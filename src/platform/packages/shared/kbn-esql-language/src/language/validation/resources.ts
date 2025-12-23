/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLPolicy } from '../../commands/registry/types';
import type { ESQLAstAllCommands, ESQLCommand } from '../../types';
import { Walker } from '../../ast';
import { getPolicyHelper, getSourcesHelper } from '../shared/resources_helpers';

function createMapFromList<T extends { name: string }>(arr: T[]): Map<string, T> {
  const arrMap = new Map<string, T>();
  for (const item of arr) {
    arrMap.set(item.name, item);
  }
  return arrMap;
}

export async function retrievePolicies(
  commands: ESQLAstAllCommands[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLPolicy>> {
  const enrichCommands = Walker.matchAll(commands, {
    type: 'command',
    name: 'enrich',
  }) as ESQLCommand[];
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
