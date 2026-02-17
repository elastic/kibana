/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { relative } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getFixturesBasePath, getTypeFixtures } from './get_type_fixtures';
import type { TypeVersionFixtures } from './types';

interface GetLatestTypeFixturesParams<T = any> {
  type: SavedObjectsType<T>;
  previous: string;
  current: string;
  fix: boolean;
}
export async function getLatestTypeFixtures({
  type,
  previous,
  current,
  fix,
}: GetLatestTypeFixturesParams): Promise<{
  previous: TypeVersionFixtures;
  current: TypeVersionFixtures;
}> {
  const { name } = type;
  const path = getFixturesBasePath(name, current);
  const relativePath = relative(REPO_ROOT, path);
  const fixtures = await getTypeFixtures({ path, type, current, previous, generate: fix });

  return {
    previous: {
      relativePath,
      version: previous,
      documents: fixtures[previous],
    },
    current: {
      relativePath,
      version: current,
      documents: fixtures[current],
    },
  };
}
