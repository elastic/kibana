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
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { Task, FixtureMap } from '../types';

export function checkDocuments({
  repository,
  types,
  fixtures,
}: {
  repository: ISavedObjectsRepository;
  types: SavedObjectsType[];
  fixtures: FixtureMap;
}): Task {
  return async () => {
    const typeNames = types.map(({ name }) => name);
    const results = await repository.search({ type: typeNames, namespaces: ['*'] });

    results.hits.hits.forEach((hit) => {
      const type = hit._source!.type;
      const attributes = hit._source![type];
      const { relativePath, version, documents } = fixtures[type];
      const matchingFixture = documents.find((fixture) => equal(fixture, attributes));
      if (!matchingFixture) {
        const messages = [
          `❌ A document of type '${type}' did NOT match any of the fixtures`,
          ...documents.map((fixture, index) => [
            `document 🆚 fixtures['${version}'][${index}] (${relativePath})\n`,
            diff(fixture, attributes),
          ]),
        ];
        throw new Error(messages.join('\n'));
      }
    });
  };
}
