/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncForEach } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import type { MigrationSnapshot, ServerHandles } from '../../types';
import type { FixtureTemplate } from './types';
import { getVersions } from '../versions';
import { getTypeFixtures } from './get_type_fixtures';

interface TestForwardAndBackwardMigrationsParams {
  snapshot: MigrationSnapshot;
  serverHandles: ServerHandles;
  types: string[];
  fix?: boolean;
  log: ToolingLog;
}

export async function getFixtures({
  snapshot,
  serverHandles: {
    coreStart: { savedObjects },
  },
  types,
  fix,
  log,
}: TestForwardAndBackwardMigrationsParams) {
  log.info(`Obtaining sample objects (fixtures) for the following types: ${types}`);
  const registry = savedObjects.getTypeRegistry();
  let previousVersionObjects: FixtureTemplate[] = [];
  let currentVersionObjects: FixtureTemplate[] = [];

  // validate fixture files for each of the updated types; obtain sample SOs for testing
  asyncForEach(types, async (name) => {
    const type = registry.getType(name)!;
    const typeSnapshot = snapshot.typeDefinitions[name];
    const [current, previous] = getVersions(typeSnapshot);
    const fixtures = await getTypeFixtures({ type, current, previous, generate: Boolean(fix) });
    previousVersionObjects = previousVersionObjects.concat(fixtures[previous]);
    currentVersionObjects = currentVersionObjects.concat(fixtures[current]);
  });

  return { previousVersionObjects, currentVersionObjects };
}
