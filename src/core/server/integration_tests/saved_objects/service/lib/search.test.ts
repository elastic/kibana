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
    namespaceType: 'single',
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
});
