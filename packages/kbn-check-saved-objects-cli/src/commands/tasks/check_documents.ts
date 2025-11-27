/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { diff } from 'jest-diff';
import equal from 'fast-deep-equal';
import type { FixtureTemplate } from '../../migrations/fixtures';
import type { Task, TaskContext } from '../types';
import { getFixturesRelativePath } from '../../migrations/fixtures';
import { latestVersion } from '../../migrations';

export function checkDocuments({
  repository,
  fixtures,
}: {
  repository: ISavedObjectsRepository;
  fixtures: Record<string, FixtureTemplate[]>;
}): Task {
  return async (ctx: TaskContext) => {
    const types = Object.keys(fixtures);
    const results = await repository.search({ type: types, namespaces: ['*'] });

    results.hits.hits.forEach((hit) => {
      const type = hit._source!.type;
      const attributes = hit._source![type];

      const matchingFixture = fixtures[type].find((fixture) => equal(fixture, attributes));
      if (!matchingFixture) {
        const path = getFixturesRelativePath(type, ctx.typeVersionMap[type]);
        const targetVersion = latestVersion(ctx.updatedTypes.find(({ name }) => name === type)!);
        const messages = [
          `❌ A document of type '${type}' did NOT match any of the fixtures`,
          ...fixtures[type].flatMap((fixture, index) => [
            `document 🆚 fixtures['${targetVersion}'][${index}] (${path})`,
            diff(fixture, attributes),
          ]),
        ];
        throw new Error(messages.join('\n'));
      }
    });
  };
}
