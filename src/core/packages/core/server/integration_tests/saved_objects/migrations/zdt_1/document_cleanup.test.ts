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
import { range } from 'lodash';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import {
  getBaseMigratorParams,
  getDeletedType,
  getExcludedType,
  getFooType,
  getBarType,
  dummyModelVersion,
} from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'document_cleanup.test.log');

describe('ZDT upgrades - document cleanup', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getFooType(), getBarType(), getDeletedType(), getExcludedType()],
    });
    await runMigrations();

    const fooObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `foo-${number}`,
      type: 'foo',
      attributes: {
        someField: `foo_${number}`,
      },
    }));

    const barObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `bar-${number}`,
      type: 'bar',
      attributes: {
        aKeyword: `bar_${number}`,
      },
    }));

    const deletedObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `server-${number}`,
      type: 'server',
      attributes: {
        text: `some text`,
      },
    }));

    const excludedObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `excluded-${number}`,
      type: 'excluded',
      attributes: {
        value: number,
      },
    }));

    await savedObjectsRepository.bulkCreate([
      ...fooObjs,
      ...barObjs,
      ...deletedObjs,
      ...excludedObjs,
    ]);
  };

  it('deletes the documents', async () => {
    await createBaseline();

    const fooType = getFooType();
    const excludedType = getExcludedType();

    fooType.modelVersions = {
      ...fooType.modelVersions,
      '3': dummyModelVersion,
    };

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [fooType, excludedType],
    });

    await runMigrations();

    const indexContent = await client.search<{ type: string }>({ index: '.kibana_1', size: 100 });

    // normal type
    expect(countResultsByType(indexContent, 'foo')).toEqual(5);
    // unknown type
    expect(countResultsByType(indexContent, 'bar')).toEqual(0);
    // deleted type
    expect(countResultsByType(indexContent, 'server')).toEqual(0);
    // excludeOnUpgrade type
    expect(countResultsByType(indexContent, 'excluded')).toEqual(3);
  });
});

const countResultsByType = (
  indexContents: SearchResponse<{ type: string }>,
  type: string
): number => {
  return indexContents.hits.hits.filter((result) => result._source?.type === type).length;
};
