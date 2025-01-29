/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { baselineTypes } from './kibana_migrator_test_kit.fixtures';

export async function expectDocumentsMigratedToHighestVersion(
  client: ElasticsearchClient,
  index: string | string[]
) {
  const typeMigrationVersions: Record<string, string> = {
    basic: '10.1.0', // did not define any model versions
    server: '10.1.0', // did not define any model versions
    deprecated: '10.1.0', // did not define any model versions
    complex: '10.2.0',
    task: '10.2.0',
  };

  const resultSets = await Promise.all(
    baselineTypes.map(({ name: type }) =>
      client.search<any>({
        index,
        query: {
          bool: {
            should: [
              {
                term: { type },
              },
            ],
          },
        },
      })
    )
  );

  const notUpgraded = resultSets
    .flatMap((result) => result.hits.hits)
    .find(
      (document) =>
        document._source.typeMigrationVersion !== typeMigrationVersions[document._source.type]
    );
  expect(notUpgraded).toBeUndefined();
}
