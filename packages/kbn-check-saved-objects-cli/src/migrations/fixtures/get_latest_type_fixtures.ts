/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationSnapshot } from '../../types';
import type { FixtureTemplate } from './types';
import { getVersions } from '../versions';
import { getTypeFixtures } from './get_type_fixtures';

interface GetLatestTypeFixturesParams<T = any> {
  type: SavedObjectsType<T>;
  snapshot: MigrationSnapshot;
  fix: boolean;
}
export async function getLatestTypeFixtures({
  type,
  snapshot,
  fix,
}: GetLatestTypeFixturesParams): Promise<{
  previous: FixtureTemplate[];
  current: FixtureTemplate[];
}> {
  const typeSnapshot = snapshot.typeDefinitions[type.name];
  const [current, previous] = getVersions(typeSnapshot);
  const fixtures = await getTypeFixtures({ type, current, previous, generate: Boolean(fix) });
  return { previous: fixtures[previous], current: fixtures[current] };
}
