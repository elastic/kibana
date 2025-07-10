/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';

/**
 * Start the traditional ES cluster and return the instance.
 */
export const startElasticsearch = async ({
  basePath,
  dataArchive,
  timeout,
}: {
  basePath?: string;
  dataArchive?: string;
  timeout?: number;
} = {}): Promise<TestElasticsearchUtils> => {
  const { startES } = createTestServers({
    adjustTimeout: (t: number) => jest.setTimeout(t + (timeout ?? 0)),
    settings: {
      es: {
        license: 'basic',
        basePath,
        dataArchive,
      },
    },
  });
  return await startES();
};
