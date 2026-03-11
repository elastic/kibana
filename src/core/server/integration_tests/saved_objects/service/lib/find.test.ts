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

interface NestedFieldSOAttributes {
  user: {
    name: string;
    email: string;
  };
}

const users: NestedFieldSOAttributes[] = [
  { user: { name: 'John Doe', email: 'john.doe@example.com' } },
  { user: { name: 'Jane Doe', email: 'jane.doe@example.com' } },
  { user: { name: 'Alice Smith', email: 'alice.smith@example.com' } },
  { user: { name: 'Alice Johnson', email: 'alice.johnson@example.com' } },
  { user: { name: 'Charlie Brown', email: 'charlie.brown@example.com' } },
];

const registerSOTypes = (setup: InternalCoreSetup) => {
  setup.savedObjects.registerType({
    name: 'find-test-nested-field-type',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        user: {
          type: 'nested',
          properties: { name: { type: 'text' }, email: { type: 'keyword' } },
        },
      },
    },
    management: {
      importableAndExportable: true,
    },
    modelVersions: {},
  });
};

describe('SOR - find API', () => {
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

    registerSOTypes(setup);

    const start = await root.start();
    savedObjectsRepository = start.savedObjects.createInternalRepository();

    await savedObjectsRepository.bulkCreate(
      users.map((user) => ({
        type: 'find-test-nested-field-type',
        attributes: user,
      }))
    );
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('supports nested fields', async () => {
    const documents = await savedObjectsRepository.find<NestedFieldSOAttributes>({
      type: 'find-test-nested-field-type',
      searchFields: ['user.name'],
      search: 'John',
    });

    expect(documents.total).toBe(1);
    expect(documents.saved_objects[0].attributes?.user?.name).toBe('John Doe');
    expect(documents.saved_objects[0].attributes?.user?.email).toBe('john.doe@example.com');
  });

  it('supports nested fields with wildcard', async () => {
    const documents = await savedObjectsRepository.find<NestedFieldSOAttributes>({
      type: 'find-test-nested-field-type',
      searchFields: ['user.email'],
      search: 'alice*',
    });

    expect(documents.total).toBe(2);
    expect(documents.saved_objects[0].attributes?.user?.name).toBe('Alice Smith');
    expect(documents.saved_objects[0].attributes?.user?.email).toBe('alice.smith@example.com');
    expect(documents.saved_objects[1].attributes?.user?.name).toBe('Alice Johnson');
    expect(documents.saved_objects[1].attributes?.user?.email).toBe('alice.johnson@example.com');
  });
});
