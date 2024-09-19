/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { estypes } from '@elastic/elasticsearch';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import JSON5 from 'json5';
import { ElasticsearchClient } from '../../../elasticsearch';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../../../config/mocks';
import { retryAsync } from '../test_helpers/retry_async';
import { LogRecord } from '@kbn/logging';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const targetIndex = `.kibana_${kibanaVersion}_001`;
const logFilePath = Path.join(__dirname, '7_13_unknown_types.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let startES: () => Promise<kbnTestServer.TestElasticsearchUtils>;

  beforeAll(async () => {
    await removeLogFile();
  });

  beforeEach(() => {
    ({ startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // dataset contains 2 type of unknown docs
          // `foo` documents
          // `space` documents (to mimic a migration with disabled plugins)
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_with_unknown_so.zip'),
        },
      },
    }));
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  it('logs a warning and completes the migration with unknown docs retained', async () => {
    root = createRoot();
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await root.start();

    let unknownDocsWarningLog: LogRecord;

    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str));

        unknownDocsWarningLog = records.find((rec) =>
          rec.message.startsWith(`[.kibana] CHECK_UNKNOWN_DOCUMENTS`)
        );

        expect(
          unknownDocsWarningLog.message.startsWith(
            '[.kibana] CHECK_UNKNOWN_DOCUMENTS Upgrades will fail for 8.0+ because documents were found for unknown saved ' +
              'object types. To ensure that upgrades will succeed in the future, either re-enable plugins or delete ' +
              `these documents from the "${targetIndex}" index after the current upgrade completes.`
          )
        ).toBeTruthy();
      },
      { retryAttempts: 10, retryDelayMs: 200 }
    );

    const unknownDocs = [
      { type: 'space', id: 'space:default' },
      { type: 'space', id: 'space:first' },
      { type: 'space', id: 'space:second' },
      { type: 'space', id: 'space:third' },
      { type: 'space', id: 'space:forth' },
      { type: 'space', id: 'space:fifth' },
      { type: 'space', id: 'space:sixth' },
      { type: 'foo', id: 'P2SQfHkBs3dBRGh--No5' },
      { type: 'foo', id: 'QGSZfHkBs3dBRGh-ANoD' },
      { type: 'foo', id: 'QWSZfHkBs3dBRGh-hNob' },
    ];

    unknownDocs.forEach(({ id, type }) => {
      expect(unknownDocsWarningLog.message).toEqual(
        expect.stringContaining(`- "${id}" (type: "${type}")`)
      );
    });

    const client: ElasticsearchClient = esServer.es.getClient();
    const { body: response } = await client.indices.getSettings({
      index: targetIndex,
    });
    const settings = response[targetIndex].settings as estypes.IndicesIndexStatePrefixedSettings;
    expect(settings.index).not.toBeUndefined();
    expect(settings.index!.blocks?.write).not.toEqual('true');

    // Ensure that documents for unknown types were preserved in target index in an unmigrated state
    const spaceDocs = await fetchDocs(client, targetIndex, 'space');
    expect(spaceDocs.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'space:default',
        'space:first',
        'space:second',
        'space:third',
        'space:forth',
        'space:fifth',
        'space:sixth',
      ])
    );
    spaceDocs.forEach((d) => {
      expect(d.migrationVersion.space).toEqual('6.6.0');
      expect(d.coreMigrationVersion).toEqual('7.13.0');
    });
    const fooDocs = await fetchDocs(client, targetIndex, 'foo');
    expect(fooDocs.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'P2SQfHkBs3dBRGh--No5',
        'QGSZfHkBs3dBRGh-ANoD',
        'QWSZfHkBs3dBRGh-hNob',
      ])
    );
    fooDocs.forEach((d) => {
      expect(d.migrationVersion.foo).toEqual('7.13.0');
      expect(d.coreMigrationVersion).toEqual('7.13.0');
    });
  });

  it('migrates outdated documents when types are re-enabled', async () => {
    // Start kibana with foo and space types disabled
    root = createRoot();
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await root.start();

    // Shutdown and start Kibana again with space type registered to ensure space docs get migrated
    await root.shutdown();
    root = createRoot();
    await root.preboot();
    const coreSetup = await root.setup();
    coreSetup.savedObjects.registerType({
      name: 'space',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '6.6.0': (d) => d,
        [kibanaVersion]: (d) => d,
      },
    });
    await root.start();

    const client: ElasticsearchClient = esServer.es.getClient();
    const spacesDocsMigrated = await fetchDocs(client, targetIndex, 'space');
    expect(spacesDocsMigrated.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'space:default',
        'space:first',
        'space:second',
        'space:third',
        'space:forth',
        'space:fifth',
        'space:sixth',
      ])
    );
    spacesDocsMigrated.forEach((d) => {
      expect(d.migrationVersion.space).toEqual(kibanaVersion); // should be migrated
      expect(d.coreMigrationVersion).toEqual(kibanaVersion);
    });

    // Make sure unmigrated foo docs are also still there in an unmigrated state
    const fooDocsUnmigrated = await fetchDocs(client, targetIndex, 'foo');
    expect(fooDocsUnmigrated.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'P2SQfHkBs3dBRGh--No5',
        'QGSZfHkBs3dBRGh-ANoD',
        'QWSZfHkBs3dBRGh-hNob',
      ])
    );
    fooDocsUnmigrated.forEach((d) => {
      expect(d.migrationVersion.foo).toEqual('7.13.0'); // should still not be migrated
      expect(d.coreMigrationVersion).toEqual('7.13.0');
    });
  });
});

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        enableV2: true,
        batchSize: 5,
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
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}

async function fetchDocs(esClient: ElasticsearchClient, index: string, type: string) {
  const { body } = await esClient.search<any>({
    index,
    size: 10000,
    body: {
      query: {
        bool: {
          should: [
            {
              term: { type },
            },
          ],
        },
      },
    },
  });

  return body.hits.hits.map((h) => ({
    ...h._source,
    id: h._id,
  }));
}
