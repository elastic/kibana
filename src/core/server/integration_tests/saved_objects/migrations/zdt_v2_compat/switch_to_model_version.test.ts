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
import { range, sortBy } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile, createType } from '../test_utils';
import { getBaseMigratorParams, noopMigration } from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'switch_to_model_version.test.log');

describe('ZDT with v2 compat - type switching from migration to model version', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const typeBefore = createType({
    name: 'switching_type',
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
      },
    },
    migrations: {
      '7.0.0': noopMigration,
      '7.5.0': noopMigration,
    },
  });

  const typeAfter = createType({
    name: 'switching_type',
    mappings: {
      properties: {
        text: { type: 'text' },
        keyword: { type: 'keyword' },
        newField1: { type: 'text' },
        newField2: { type: 'text' },
      },
    },
    migrations: {
      '7.0.0': noopMigration,
      '7.5.0': noopMigration,
      '7.9.0': (doc) => {
        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            newField1: `new1 ${doc.id}`,
          },
        };
      },
    },
    switchToModelVersionAt: '8.0.0',
    modelVersions: {
      1: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return {
                attributes: {
                  newField2: `new2 ${doc.id}`,
                },
              };
            },
          },
        ],
      },
    },
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [typeBefore],
    });
    await runMigrations();

    const sampleObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `doc-${number}`,
      type: 'switching_type',
      attributes: {
        text: `text ${number}`,
        keyword: `kw ${number}`,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleObjs);
  };

  it('migrates the documents', async () => {
    await createBaseline();

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeAfter],
    });

    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const index = indices['.kibana_1'];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        switching_type: typeAfter.mappings,
      })
    );

    expect(mappingMeta.docVersions).toEqual({
      switching_type: '10.1.0',
    });

    const { saved_objects: sampleDocs } = await savedObjectsRepository.find({
      type: 'switching_type',
    });

    expect(sampleDocs).toHaveLength(5);

    const sampleData = sortBy(sampleDocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
    }));

    expect(sampleData).toEqual(
      range(5).map((i) => ({
        id: `doc-${i}`,
        type: 'switching_type',
        attributes: {
          text: `text ${i}`,
          keyword: `kw ${i}`,
          newField1: `new1 doc-${i}`,
          newField2: `new2 doc-${i}`,
        },
      }))
    );

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntry('Migration completed');
  });
});
