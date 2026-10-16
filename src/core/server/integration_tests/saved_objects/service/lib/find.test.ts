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

interface DeeplyNestedFieldSOAttributes {
  comments: Array<{
    message: string;
    metadata: {
      author: string;
      tag: string;
    };
  }>;
}

const users: NestedFieldSOAttributes[] = [
  { user: { name: 'John Doe', email: 'john.doe@example.com' } },
  { user: { name: 'Jane Doe', email: 'jane.doe@example.com' } },
  { user: { name: 'Alice Smith', email: 'alice.smith@example.com' } },
  { user: { name: 'Alice Johnson', email: 'alice.johnson@example.com' } },
  { user: { name: 'Charlie Brown', email: 'charlie.brown@example.com' } },
];

const deeplyNestedDocs: DeeplyNestedFieldSOAttributes[] = [
  {
    comments: [
      { message: 'great post', metadata: { author: 'alice', tag: 'review' } },
      { message: 'needs work', metadata: { author: 'bob', tag: 'feedback' } },
    ],
  },
  {
    comments: [{ message: 'excellent', metadata: { author: 'charlie', tag: 'review' } }],
  },
  {
    comments: [{ message: 'not helpful', metadata: { author: 'diana', tag: 'complaint' } }],
  },
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

  setup.savedObjects.registerType({
    name: 'find-test-deeply-nested-field-type',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {
        comments: {
          type: 'nested',
          properties: {
            message: { type: 'text' },
            metadata: {
              properties: {
                author: { type: 'text' },
                tag: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
    management: {
      importableAndExportable: true,
    },
    modelVersions: {},
  });

  setup.savedObjects.registerType({
    name: 'find-test-hidden-type',
    hidden: true,
    namespaceType: 'agnostic',
    mappings: {
      properties: {
        title: { type: 'text' },
      },
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
    const hiddenRepository = start.savedObjects.createInternalRepository(['find-test-hidden-type']);

    await hiddenRepository.bulkCreate([
      { type: 'find-test-hidden-type', attributes: { title: 'hidden one' } },
      { type: 'find-test-hidden-type', attributes: { title: 'hidden two' } },
    ]);

    await savedObjectsRepository.bulkCreate(
      users.map((user) => ({
        type: 'find-test-nested-field-type',
        attributes: user,
      }))
    );

    await savedObjectsRepository.bulkCreate(
      deeplyNestedDocs.map((doc) => ({
        type: 'find-test-deeply-nested-field-type',
        attributes: doc,
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
    expect(
      documents.saved_objects
        .map(({ attributes }) => attributes.user)
        .sort((first, second) => first.email.localeCompare(second.email))
    ).toEqual([
      { name: 'Alice Johnson', email: 'alice.johnson@example.com' },
      { name: 'Alice Smith', email: 'alice.smith@example.com' },
    ]);
  });

  it('supports deeply nested fields under a nested ancestor', async () => {
    const documents = await savedObjectsRepository.find<DeeplyNestedFieldSOAttributes>({
      type: 'find-test-deeply-nested-field-type',
      searchFields: ['comments.metadata.author'],
      search: 'charlie',
    });

    expect(documents.total).toBe(1);
    expect(documents.saved_objects[0].attributes?.comments[0]?.metadata?.author).toBe('charlie');
  });

  it('supports deeply nested fields with wildcard', async () => {
    const documents = await savedObjectsRepository.find<DeeplyNestedFieldSOAttributes>({
      type: 'find-test-deeply-nested-field-type',
      searchFields: ['comments.metadata.author'],
      search: 'ali*',
    });

    expect(documents.total).toBe(1);
    expect(documents.saved_objects[0].attributes?.comments[0]?.metadata?.author).toBe('alice');
  });

  it('does not include hidden types in a terms aggregation', async () => {
    const result = await savedObjectsRepository.find({
      type: ['find-test-nested-field-type', 'find-test-hidden-type'],
      perPage: 0,
      aggs: { all_types: { terms: { field: 'type', size: 50 } } },
    });

    expect(result).toEqual({
      aggregations: {
        all_types: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [{ key: 'find-test-nested-field-type', doc_count: users.length }],
        },
      },
      page: 1,
      per_page: 0,
      total: users.length,
      saved_objects: [],
      pit_id: undefined,
    });
  });

  it('does not include hidden types in a cardinality aggregation', async () => {
    const result = await savedObjectsRepository.find({
      type: ['find-test-nested-field-type', 'find-test-hidden-type'],
      perPage: 0,
      aggs: { type_count: { cardinality: { field: 'type' } } },
    });

    expect(result).toEqual({
      aggregations: {
        type_count: { value: 1 },
      },
      page: 1,
      per_page: 0,
      total: users.length,
      saved_objects: [],
      pit_id: undefined,
    });
  });
});
