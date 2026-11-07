/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs/promises';
import '../jest_matchers';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '@kbn/migrator-test-kit';
import { parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getFooType, getBarType } from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'create_index.test.log');

// index creation on Serverless is covered by the serverless integration tests, which run a Serverless Elasticsearch
describe('v3 migrations - running on a fresh cluster', () => {
  let esServer: TestElasticsearchUtils['es'];

  const getParams = () => ({
    ...getBaseMigratorParams({ migrationAlgorithm: 'v3', kibanaVersion: '9.4.0' }),
    logFilePath,
    types: [getFooType(), getBarType()],
  });

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('creates the index with its aliases, the mappings and the model versions', async () => {
    const { runMigrations, client } = await getKibanaMigratorTestKit(getParams());

    expect(await runMigrations()).toEqual([
      {
        status: 'patched',
        destIndex: '.kibana',
        elapsedMs: expect.any(Number),
      },
    ]);

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const { aliases = {}, mappings = {} } = indices['.kibana_1'];
    expect(Object.keys(aliases).sort()).toEqual(['.kibana', '.kibana_9.4.0']);
    expect(mappings.properties).toEqual(
      expect.objectContaining({ foo: getFooType().mappings, bar: getBarType().mappings })
    );
    // v3 doesn't coordinate instances through _meta.migrationState
    expect(mappings._meta).toEqual({
      mappingVersions: { foo: '10.2.0', bar: '10.1.0' },
      docVersions: { foo: '10.2.0', bar: '10.1.0' },
    });

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      [
        'INIT -> CHECK_CLUSTER_ROUTING_ALLOCATION',
        'CHECK_CLUSTER_ROUTING_ALLOCATION -> CREATE_TARGET_INDEX',
        'CREATE_TARGET_INDEX -> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );
  });

  it('does nothing when run again', async () => {
    await fs.unlink(logFilePath);
    const { runMigrations } = await getKibanaMigratorTestKit(getParams());
    await runMigrations();

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      ['INIT -> INDEX_STATE_UPDATE_DONE', 'INDEX_STATE_UPDATE_DONE -> DONE', 'Migration completed'],
      { ordered: true }
    );
  });
});
