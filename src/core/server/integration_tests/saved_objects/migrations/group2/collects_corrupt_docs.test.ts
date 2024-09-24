/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import Util from 'util';
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Root } from '@kbn/core-root-server-internal';
import { getMigrationDocLink } from '../test_utils';

const migrationDocLink = getMigrationDocLink().resolveMigrationFailures;
const logFilePath = Path.join(__dirname, 'collects_corrupt_docs.log');

const asyncUnlink = Util.promisify(Fs.unlink);

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

// Failing 9.0 version update: https://github.com/elastic/kibana/issues/192624
describe.skip('migration v2 with corrupt saved object documents', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;

  beforeAll(async () => {
    await removeLogFile();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('collects corrupt saved object documents across batches', async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // contains 4 `foo` objects, all with a `migrationVersion` of `7.13.0`
          //   - foo:1 and foo:2 have correct values for their `number` property (13 and 42 respectively)
          //   - foo:3 and foo:4 don't have the property, and will fail during the `7.14.0` registered migration
          // contains migrated index with 8.0 aliases to skip migration, but run outdated doc search
          dataArchive: Path.join(
            __dirname,
            '..',
            'archives',
            '8.0.0_document_migration_failure.zip'
          ),
        },
      },
    });

    root = createRoot();

    esServer = await startES();
    await root.preboot();
    const coreSetup = await root.setup();

    coreSetup.savedObjects.registerType({
      name: 'foo',
      hidden: false,
      mappings: {
        properties: {
          number: { type: 'integer' },
        },
      },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => {
          if (doc.attributes.number === undefined) {
            throw new Error('"number" attribute should be present');
          }
          doc.attributes = {
            ...doc.attributes,
            number: doc.attributes.number + 9000,
          };
          return doc;
        },
      },
    });

    try {
      await root.start();
      expect(true).toEqual(false);
    } catch (err) {
      const errorMessage = err.message as string;
      const errorLines = errorMessage.split('\n');
      const errorMessageWithoutStack = errorLines
        .filter((line: string) => !line.includes(' at '))
        .join('\n');

      expect(errorMessageWithoutStack).toMatchInlineSnapshot(`
        "Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: 2 transformation errors were encountered:
        - foo:3: Error: Migration function for version 7.14.0 threw an error
        Caused by:
        Error: \\"number\\" attribute should be present
        - foo:4: Error: Migration function for version 7.14.0 threw an error
        Caused by:
        Error: \\"number\\" attribute should be present

        To allow migrations to proceed, please delete or fix these documents.
        Note that you can configure Kibana to automatically discard corrupt documents and transform errors for this migration.
        Please refer to ${migrationDocLink} for more information."
      `);

      expectMatchOrder(errorLines, [
        {
          mode: 'equal',
          value: '- foo:3: Error: Migration function for version 7.14.0 threw an error',
        },
        {
          mode: 'contain',
          value: 'at transform',
        },
        {
          mode: 'equal',
          value: 'Caused by:',
        },
        {
          mode: 'equal',
          value: 'Error: "number" attribute should be present',
        },
        {
          mode: 'contain',
          value: 'at 7.14.0',
        },
        {
          mode: 'equal',
          value: '- foo:4: Error: Migration function for version 7.14.0 threw an error',
        },
        {
          mode: 'contain',
          value: 'at transform',
        },
        {
          mode: 'equal',
          value: 'Caused by:',
        },
        {
          mode: 'equal',
          value: 'Error: "number" attribute should be present',
        },
        {
          mode: 'contain',
          value: 'at 7.14.0',
        },
      ]);
    }
  });
});

function createRoot() {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
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
            level: 'info',
          },
        ],
      },
    },
    {
      oss: false,
    }
  );
}

type FindInOrderPattern = { mode: 'equal'; value: string } | { mode: 'contain'; value: string };

const expectMatchOrder = (lines: string[], patterns: FindInOrderPattern[]) => {
  let lineIdx = 0;
  let patternIdx = 0;

  while (lineIdx < lines.length && patternIdx < patterns.length) {
    const line = lines[lineIdx];
    const pattern = patterns[patternIdx];
    if (lineMatch(line, pattern)) {
      patternIdx++;
    }
    lineIdx++;
  }

  expect(patternIdx).toEqual(patterns.length);
};

const lineMatch = (line: string, pattern: FindInOrderPattern) => {
  if (pattern.mode === 'contain') {
    return line.trim().includes(pattern.value.trim());
  }
  return line.trim() === pattern.value.trim();
};
