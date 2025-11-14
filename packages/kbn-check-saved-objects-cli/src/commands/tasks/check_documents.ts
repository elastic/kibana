/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import equal from 'fast-deep-equal';
import type { FixtureTemplate } from '../../migrations/fixtures';
import type { Task } from '../types';

export function checkDocuments({
  repository,
  fixtures,
}: {
  repository: ISavedObjectsRepository;
  fixtures: Record<string, FixtureTemplate[]>;
}): Task {
  return async () => {
    const types = Object.keys(fixtures);
    const results = await repository.search({ type: types, namespaces: ['*'] });

    results.hits.hits.forEach((hit) => {
      const type = hit._source!.type;
      const attributes = hit._source![type];

      const matchingFixture = fixtures[type].find((fixture) => equal(fixture, attributes));
      if (!matchingFixture) {
        const messages = [
          '❌ The following document did NOT match any of the fixtures',
          '📄 Document:',
          JSON.stringify(hit, null, 2),
          `🗃️ Fixtures for the '${type}' type:`,
          JSON.stringify(fixtures[type], null, 2),
        ];
        throw new Error(messages.join('\n'));
      }
    });
  };
}
