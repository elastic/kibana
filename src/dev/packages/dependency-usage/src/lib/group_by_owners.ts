/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCodeOwnersForFile, getPathsWithOwnersReversed } from './code_owners.ts';

interface DependencyByOwnerEntry<T = string[]> {
  modules: T;
  deps: T;
  teams: T;
}

const UNKNOWN_OWNER = 'unknown';
const MULTIPLE_TEAMS_OWNER = 'multiple_teams';

export function groupFilesByOwners(dependencies: Array<{ from: string; to: string }>) {
  const ownerFilesMap = new Map();
  const reversedCodeowners = getPathsWithOwnersReversed();

  for (const dep of dependencies) {
    const { from, to } = dep;

    const owners = getCodeOwnersForFile(from, reversedCodeowners) ?? [UNKNOWN_OWNER];
    const ownerKey = owners.length > 1 ? MULTIPLE_TEAMS_OWNER : owners[0];

    if (ownerKey === MULTIPLE_TEAMS_OWNER) {
      if (!ownerFilesMap.has(ownerKey)) {
        ownerFilesMap.set(ownerKey, new Map());
      }

      const modulesMap = ownerFilesMap.get(ownerKey);

      if (!modulesMap.has(from)) {
        modulesMap.set(from, { deps: new Set(), modules: new Set(), teams: new Set() });
      }

      const moduleEntry = modulesMap.get(from);

      moduleEntry.deps.add(to.replace(/^node_modules\//, ''));
      moduleEntry.modules.add(from);

      for (const owner of owners) {
        moduleEntry.teams.add(owner);
      }

      continue;
    }

    if (!ownerFilesMap.has(ownerKey)) {
      ownerFilesMap.set(ownerKey, { deps: new Set(), modules: new Set(), teams: new Set(owners) });
    }

    ownerFilesMap.get(ownerKey).deps.add(to.replace(/^node_modules\//, ''));
    ownerFilesMap.get(ownerKey).modules.add(from);
  }

  const result: Record<string, DependencyByOwnerEntry | DependencyByOwnerEntry[]> = {};

  const transformRecord = (entry: DependencyByOwnerEntry<Set<string>>) => ({
    modules: Array.from(entry.modules),
    deps: Array.from(entry.deps),
    teams: Array.from(entry.teams),
  });

  for (const [key, ownerRecord] of ownerFilesMap.entries()) {
    const isMultiTeamRecord = key === MULTIPLE_TEAMS_OWNER;

    if (isMultiTeamRecord) {
      if (!Array.isArray(result[MULTIPLE_TEAMS_OWNER])) {
        result[MULTIPLE_TEAMS_OWNER] = [];
      }

      for (const [, multiTeamRecord] of ownerRecord.entries()) {
        (result[key] as DependencyByOwnerEntry[]).push(transformRecord(multiTeamRecord));
      }

      continue;
    }

    result[key] = transformRecord(ownerRecord);
  }

  return result;
}
