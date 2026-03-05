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
import { URL } from 'url';
import type { Client } from '@elastic/elasticsearch';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { InternalCoreSetup } from '@kbn/core-lifecycle-server-internal';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

export const logFilePath = Path.join(__dirname, 'esql.test.log');

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
    name: 'esql-test-type',
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

describe('SOR - esql API', () => {
  let root: Root;
  let esServer: TestElasticsearchUtils;
  let savedObjectsRepository: ISavedObjectsRepository;

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});

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
          type: 'esql-test-type',
          attributes: user,
        }))
        .concat(
          users.slice(0, 2).map((user) => ({
            type: 'esql-test-type',
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

  it('should perform a basic ES|QL query', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      pipeline:
        '| KEEP `esql-test-type.name`, `esql-test-type.email` | SORT `esql-test-type.email` | LIMIT 10',
    });

    expect(result.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'esql-test-type.name' }),
        expect.objectContaining({ name: 'esql-test-type.email' }),
      ])
    );
    expect(result.values).toHaveLength(5);
  });

  it('should scope results to the requested namespace', async () => {
    const defaultResult = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      pipeline: '| KEEP `esql-test-type.email` | LIMIT 100',
    });
    expect(defaultResult.values).toHaveLength(5);

    const namespaceAResult = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['namespaceA'],
      pipeline: '| KEEP `esql-test-type.email` | LIMIT 100',
    });
    expect(namespaceAResult.values).toHaveLength(2);
  });

  it('should support WHERE filtering in the pipeline', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      pipeline: '| WHERE `esql-test-type.email` == "john.doe@example.com" | LIMIT 10',
    });

    expect(result.values).toHaveLength(1);
  });

  it('should support SORT and LIMIT in the pipeline', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      pipeline: '| KEEP `esql-test-type.email` | SORT `esql-test-type.email` ASC | LIMIT 2',
    });

    expect(result.values).toHaveLength(2);
    // First two emails alphabetically
    const emails = result.values.map((row) => row[0]);
    expect(emails).toEqual(['alice.johnson@example.com', 'alice.smith@example.com']);
  });

  it('should support STATS aggregation in the pipeline', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      pipeline: '| STATS doc_count = COUNT(*)',
    });

    expect(result.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'doc_count' })])
    );
    expect(result.values).toHaveLength(1);
    // Find the doc_count column index
    const countColIdx = result.columns.findIndex((c) => c.name === 'doc_count');
    expect(result.values[0][countColIdx]).toBe(5);
  });

  it('should include METADATA fields when specified', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      metadata: ['_id'],
      pipeline: '| KEEP _id, `esql-test-type.email` | SORT `esql-test-type.email` | LIMIT 1',
    });

    expect(result.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '_id' })])
    );
    expect(result.values).toHaveLength(1);
    // _id should be a non-empty string
    const idColIdx = result.columns.findIndex((c) => c.name === '_id');
    expect(typeof result.values[0][idColIdx]).toBe('string');
    expect((result.values[0][idColIdx] as string).length).toBeGreaterThan(0);
  });

  it('should merge user-provided filter with namespace filter', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'esql-test-type',
      namespaces: ['default'],
      filter: {
        term: { 'esql-test-type.email': 'charlie.brown@example.com' },
      },
      pipeline: '| KEEP `esql-test-type.email` | LIMIT 10',
    });

    expect(result.values).toHaveLength(1);
    expect(result.values[0][0]).toBe('charlie.brown@example.com');
  });

  it('should reject pipelines starting with a source command', async () => {
    await expect(
      savedObjectsRepository.esql({
        type: 'esql-test-type',
        namespaces: ['default'],
        pipeline: 'FROM .kibana | LIMIT 10',
      })
    ).rejects.toThrow('options.pipeline must not start with a source command');

    await expect(
      savedObjectsRepository.esql({
        type: 'esql-test-type',
        namespaces: ['default'],
        pipeline: 'ROW x = 1',
      })
    ).rejects.toThrow('options.pipeline must not start with a source command');
  });

  it('should return empty response for unknown types', async () => {
    const result = await savedObjectsRepository.esql({
      type: 'unknown-type',
      namespaces: ['default'],
      pipeline: '| LIMIT 10',
    });

    expect(result.columns).toEqual([]);
    expect(result.values).toEqual([]);
  });

  it('should throw when namespaces is an empty array', async () => {
    await expect(
      savedObjectsRepository.esql({
        type: 'esql-test-type',
        namespaces: [],
        pipeline: '| LIMIT 10',
      })
    ).rejects.toThrow('options.namespaces cannot be an empty array');
  });

  describe('privilege escalation via ENRICH', () => {
    // The saved objects client uses the kibana system user, which has elevated
    // privileges. ENRICH joins each row against an enrich index — data that may
    // be invisible to the end user but accessible to the system user.
    //
    // These tests prove the security hole exists: sensitive data from an enrich
    // policy is surfaced through the saved objects esql method.

    // Use the superuser ES client to set up the enrich policy (the kibana
    // system user doesn't have permissions to create arbitrary indices or
    // enrich policies). esServer.es.getClient() returns a superuser client.
    let superuserClient: Client;

    beforeAll(async () => {
      superuserClient = esServer.es.getClient();

      // 1. Create a source index with "sensitive" data that a normal end user
      //    would not have access to (e.g., salary, SSN).
      await superuserClient.bulk({
        index: 'sensitive_employee_data',
        refresh: true,
        operations: [
          { index: {} },
          { email: 'john.doe@example.com', salary: 150000, ssn: '123-45-6789' },
          { index: {} },
          { email: 'jane.doe@example.com', salary: 120000, ssn: '987-65-4321' },
          { index: {} },
          { email: 'alice.smith@example.com', salary: 95000, ssn: '555-12-3456' },
        ],
      });

      // 2. Create an enrich policy that exposes salary and SSN by email match.
      await superuserClient.enrich.putPolicy({
        name: 'sensitive_employee_policy',
        match: {
          indices: 'sensitive_employee_data',
          match_field: 'email',
          enrich_fields: ['salary', 'ssn'],
        },
      });

      // 3. Execute the policy to materialise the enrich index.
      await superuserClient.enrich.executePolicy({
        name: 'sensitive_employee_policy',
        wait_for_completion: true,
      });
    });

    afterAll(async () => {
      await superuserClient.enrich
        .deletePolicy({ name: 'sensitive_employee_policy' })
        .catch(() => {});
      await superuserClient.indices.delete({ index: 'sensitive_employee_data' }).catch(() => {});
    });

    it('should demonstrate that ENRICH leaks sensitive data through the system user', async () => {
      // This pipeline enriches saved object rows with data from an external
      // index. The end user would not normally have access to that index, but
      // the kibana system user does — so the ENRICH succeeds and the sensitive
      // columns appear in the response.
      //
      // TODO: After US-009 is implemented, this test should be changed to
      // expect a rejection (BadRequestError) instead of a successful response.
      const result = await savedObjectsRepository.esql({
        type: 'esql-test-type',
        namespaces: ['default'],
        pipeline:
          '| ENRICH sensitive_employee_policy ON `esql-test-type.email`' +
          ' | KEEP `esql-test-type.email`, salary, ssn' +
          ' | SORT `esql-test-type.email` ASC' +
          ' | LIMIT 10',
      });

      // The enrich policy adds salary and ssn columns to the response.
      const colNames = result.columns.map((c) => c.name);
      expect(colNames).toContain('salary');
      expect(colNames).toContain('ssn');

      // Sensitive data is returned — this is the privilege escalation hole.
      const ssnColIdx = result.columns.findIndex((c) => c.name === 'ssn');
      const salaryColIdx = result.columns.findIndex((c) => c.name === 'salary');
      const emailColIdx = result.columns.findIndex((c) => c.name === 'esql-test-type.email');

      // Find the row for john.doe and verify his sensitive data is exposed.
      const johnRow = result.values.find((row) => row[emailColIdx] === 'john.doe@example.com');
      expect(johnRow).toBeDefined();
      expect(johnRow![ssnColIdx]).toBe('123-45-6789');
      expect(johnRow![salaryColIdx]).toBe(150000);
    });
  });
});
