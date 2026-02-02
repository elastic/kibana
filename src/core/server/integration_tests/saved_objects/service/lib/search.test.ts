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
import '../../migrations/jest_matchers';
import { URL } from 'url';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { InternalCoreSetup } from '@kbn/core-lifecycle-server-internal';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
export const logFilePath = Path.join(__dirname, 'find.test.log');
import { setProxyInterrupt } from './repository_with_proxy_utils';

interface UserType {
  name: string;
  email: string;
}

const users: UserType[] = [
  { name: 'John Doe', email: 'john.doe@example.com' },
  { name: 'Jane Doe', email: 'jane.doe@example.com' },
  { name: 'Alice Smith', email: 'alice.smith@example.com' },
  { name: 'Alice Johnson', email: 'alice.johnson@example.com' },
  { name: 'Charlie Brown', email: 'charlie.brown@example.com' },
];

const registerTypes = (setup: InternalCoreSetup) => {
  setup.savedObjects.registerType({
    name: 'test-type',
    hidden: false,
    namespaceType: 'multiple',
    mappings: {
      dynamic: false,
      properties: {
        name: { type: 'text' },
        email: { type: 'keyword' },
      },
    },
    management: {
      importableAndExportable: true,
    },
    modelVersions: {},
  });
};

describe('SOR - search API', () => {
  let root: Root;
  let esServer: TestElasticsearchUtils;
  let savedObjectsRepository: ISavedObjectsRepository;

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    setProxyInterrupt(null);

    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });
    esServer = await startES();

    const { hostname: esHostname, port: esPort } = new URL(esServer.hosts[0]);

    root = createRootWithCorePlugins({
      elasticsearch: {
        hosts: [`http://${esHostname}:${esPort}`],
      },
      migrations: {
        skip: false,
      },
    });
    await root.preboot();
    const setup = await root.setup();

    registerTypes(setup);

    const start = await root.start();
    savedObjectsRepository = start.savedObjects.createInternalRepository();

    await savedObjectsRepository.bulkCreate(
      users
        .map((user) => ({
          type: 'test-type',
          attributes: user,
        }))
        .concat(
          users.slice(0, 2).map((user) => ({
            type: 'test-type',
            attributes: user,
            initialNamespaces: ['namespaceA'],
          }))
        )
    );
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('should perform objects search', async () => {
    const documents = await savedObjectsRepository.search({
      type: 'test-type',
      namespaces: ['default'],
      query: {
        match_all: {},
      },
    });

    expect(documents.hits.total).toHaveProperty('value', 5);
    expect(documents.hits.hits).toHaveProperty('0._source.test-type.name', 'John Doe');
  });

  it('should perform objects search using bool query', async () => {
    const documents = await savedObjectsRepository.search({
      type: 'test-type',
      namespaces: ['default'],
      query: {
        bool: {
          must: [
            {
              match: {
                'test-type.email': 'john.doe@example.com',
              },
            },
          ],
        },
      },
    });

    expect(documents.hits.total).toHaveProperty('value', 1);
    expect(documents.hits.hits).toHaveProperty('0._source.test-type.name', 'John Doe');
  });

  it('should perform objects search using bool query with namespaceA', async () => {
    const documents = await savedObjectsRepository.search({
      type: 'test-type',
      namespaces: ['namespaceA'],
      query: {
        bool: {
          must: [
            {
              match: {
                'test-type.email': 'john.doe@example.com',
              },
            },
          ],
        },
      },
    });

    expect(documents.hits.total).toHaveProperty('value', 1);
    expect(documents.hits.hits).toHaveProperty('0._source.test-type.name', 'John Doe');
  });

  it('should enforce namespace security with runtime field override attempt', async () => {
    // Baseline: should return 5 documents from default namespace
    const normalSearch = await savedObjectsRepository.search({
      type: 'test-type',
      namespaces: ['default'],
      query: {
        match_all: {},
      },
    });
    expect(normalSearch.hits.total).toHaveProperty('value', 5);

    // Baseline: should return 2 documents from namespaceA
    const namespaceASearch = await savedObjectsRepository.search({
      type: 'test-type',
      namespaces: ['namespaceA'],
      query: {
        match_all: {},
      },
    });
    expect(namespaceASearch.hits.total).toHaveProperty('value', 2);

    // Attempt to override namespace filter using runtime mappings should throw an error
    await expect(
      savedObjectsRepository.search({
        type: 'test-type',
        namespaces: ['default'],
        runtime_mappings: {
          namespaces: {
            type: 'keyword',
            script: {
              source: 'emit("default")', // Attempt to make all docs appear in 'default' namespace
            },
          },
        },
        query: {
          match_all: {},
        },
      })
    ).rejects.toThrow("'runtime_mappings' contains forbidden fields: namespaces");
  });
});
