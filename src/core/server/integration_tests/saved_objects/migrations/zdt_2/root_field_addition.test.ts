/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockGetBaseMappings = jest.fn();

// No other way to simulate a change in root mappings unfortunately
jest.mock(
  '@kbn/core-saved-objects-migration-server-internal/src/core/build_active_mappings',
  () => {
    const actual = jest.requireActual(
      '@kbn/core-saved-objects-migration-server-internal/src/core/build_active_mappings'
    );
    return {
      ...actual,
      getBaseMappings: () => mockGetBaseMappings(),
    };
  }
);

import Path from 'path';
import fs from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getFooType } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'root_field_addition.test.log');

describe('ZDT upgrades - introducing new root fields', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const baseMappings = {
    dynamic: 'strict',
    properties: {
      type: {
        type: 'keyword',
      },
      namespace: {
        type: 'keyword',
      },
      coreMigrationVersion: {
        type: 'keyword',
      },
      typeMigrationVersion: {
        type: 'version',
      },
    },
  };

  const createBaseline = async () => {
    mockGetBaseMappings.mockReturnValue(baseMappings);

    const fooType = getFooType();
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [fooType],
    });
    await runMigrations();
  };

  it('should support adding the new root fields', async () => {
    await createBaseline();

    const updatedMappings = {
      ...baseMappings,
      properties: {
        ...baseMappings.properties,
        someNewRootField: {
          type: 'keyword',
        },
        anotherNewRootField: {
          type: 'text',
        },
      },
    };
    mockGetBaseMappings.mockReturnValue(updatedMappings);

    const fooType = getFooType();

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [fooType],
    });

    await runMigrations();

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntries(
      [
        'mapping version check result: greater',
        'INIT -> UPDATE_INDEX_MAPPINGS',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        '-> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );

    const mappings = await client.indices.getMapping({ index: '.kibana_1' });

    expect(mappings['.kibana_1'].mappings.properties).toEqual({
      ...updatedMappings.properties,
      foo: fooType.mappings,
    });
  });
});
