/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';

import { getPrChangesCached } from './github';
import { getKibanaDir } from './utils';

export interface MoonDirectoryTargetDefinition {
  name: string;
  sourceRootPrefix: string;
}

interface MoonProjectsQueryResponse {
  projects?: unknown[];
}

const MAX_CHANGED_FILES_FOR_SELECTIVE_TARGETING = 3000;

function runMoonProjectsQuery(
  sourceRootPrefix: string,
  changedFiles: string
): MoonProjectsQueryResponse {
  const stdout = execFileSync(
    'yarn',
    [
      '--silent',
      'moon',
      'query',
      'projects',
      '--affected',
      '--downstream',
      'deep',
      '--source',
      `^${sourceRootPrefix}`,
    ],
    {
      cwd: getKibanaDir(),
      input: changedFiles,
      stdio: ['pipe', 'pipe', 'inherit'],
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const output = stdout.trim();
  return output ? (JSON.parse(output) as MoonProjectsQueryResponse) : {};
}

export async function getAffectedMoonDirectoryTargets(
  targets: MoonDirectoryTargetDefinition[]
): Promise<string[]> {
  if (targets.length === 0) {
    return [];
  }

  const prChanges = await getPrChangesCached();

  if (prChanges.length >= MAX_CHANGED_FILES_FOR_SELECTIVE_TARGETING) {
    return targets.map(({ name }) => name);
  }

  const changedFiles = prChanges
    .flatMap(({ filename, previous_filename }) =>
      previous_filename ? [filename, previous_filename] : [filename]
    )
    .join('\n');

  if (!changedFiles) {
    return [];
  }

  const affectedTargets: string[] = [];

  for (const { name, sourceRootPrefix } of targets) {
    const queryResult = runMoonProjectsQuery(sourceRootPrefix, changedFiles);
    if ((queryResult.projects ?? []).length > 0) {
      affectedTargets.push(name);
    }
  }

  return affectedTargets;
}
