/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Util from 'util';
import JSON5 from 'json5';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getMigrationDocLink, delay } from '../test_utils';
import {
  clearLog,
  currentVersion,
  defaultKibanaIndex,
  getKibanaMigratorTestKit,
  nextMinor,
  startElasticsearch,
} from '../kibana_migrator_test_kit';

const migrationDocLink = getMigrationDocLink().resolveMigrationFailures;
const logFilePath = Path.join(__dirname, 'cleanup.log');

const asyncReadFile = Util.promisify(Fs.readFile);

describe('migration v2', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  beforeEach(async () => {
    esClient = await setupBaseline();
    await clearLog(logFilePath);
  });

  it('clean ups if migration fails', async () => {
    const { runMigrations } = await setupNextMinor();

    await expect(runMigrations()).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Unable to complete saved object migrations for the [${defaultKibanaIndex}] index: Migrations failed. Reason: 1 corrupt saved object documents were found: corrupt:2baf4de0-a6d4-11ed-ba5a-39196fc76e60

      To allow migrations to proceed, please delete or fix these documents.
      Note that you can configure Kibana to automatically discard corrupt documents and transform errors for this migration.
      Please refer to ${migrationDocLink} for more information."
    `);

    const logFileContent = await asyncReadFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => JSON5.parse(str));

    const logRecordWithPit = records.find(
      (rec) => rec.message === `[${defaultKibanaIndex}] REINDEX_SOURCE_TO_TEMP_OPEN_PIT RESPONSE`
    );

    expect(logRecordWithPit).toBeTruthy();
  });

  afterEach(async () => {
    await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});

const setupBaseline = async () => {
  const typesCurrent: SavedObjectsType[] = [
    {
      name: 'complex',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        properties: {
          name: { type: 'text' },
          value: { type: 'integer' },
        },
      },
      migrations: {},
    },
  ];

  const savedObjects = [
    {
      id: 'complex:4baf4de0-a6d4-11ed-ba5a-39196fc76e60',
      body: {
        type: 'complex',
        complex: {
          name: 'foo',
          value: 5,
        },
        references: [],
        coreMigrationVersion: currentVersion,
        updated_at: '2023-02-07T11:04:44.914Z',
        created_at: '2023-02-07T11:04:44.914Z',
      },
    },
    {
      id: 'corrupt:2baf4de0-a6d4-11ed-ba5a-39196fc76e60', // incorrect id => corrupt object
      body: {
        type: 'complex',
        complex: {
          name: 'bar',
          value: 3,
        },
        references: [],
        coreMigrationVersion: currentVersion,
        updated_at: '2023-02-07T11:04:44.914Z',
        created_at: '2023-02-07T11:04:44.914Z',
      },
    },
  ];

  const { runMigrations, client } = await getKibanaMigratorTestKit({
    types: typesCurrent,
    logFilePath,
  });

  await runMigrations();

  // inject corrupt saved objects directly using esClient
  await Promise.all(
    savedObjects.map((savedObject) => {
      client.create({
        index: defaultKibanaIndex,
        refresh: 'wait_for',
        ...savedObject,
      });
    })
  );

  return client;
};

const setupNextMinor = async () => {
  const typesNextMinor: SavedObjectsType[] = [
    {
      name: 'complex',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        properties: {
          name: { type: 'keyword' },
          value: { type: 'long' },
        },
      },
      migrations: {
        [nextMinor]: (doc) => doc,
      },
    },
  ];

  return await getKibanaMigratorTestKit({
    types: typesNextMinor,
    kibanaVersion: nextMinor,
    logFilePath,
    settings: {
      migrations: {
        skip: false,
      },
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: logFilePath,
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            appenders: ['file'],
            level: 'debug', // DEBUG logs are required to retrieve the PIT _id from the action response logs
          },
        ],
      },
    },
  });
};
