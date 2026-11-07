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
import { getFips } from 'crypto';
import { escapeRegExp } from 'lodash';
import '../jest_matchers';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  getAggregatedTypesCount,
  nextMinor,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import {
  getCompatibleMigratorTestKit,
  getTransformErrorBaselineTypes,
  REMOVED_TYPES,
} from '@kbn/migrator-test-kit/fixtures';
import { parseLogFile } from '../test_utils';
import {
  BASELINE_DOCUMENTS_PER_TYPE_SMALL,
  BASELINE_TEST_ARCHIVE_SMALL,
} from '../kibana_migrator_archive_utils';

const logFilePath = Path.join(__dirname, 'upgrade_from_v2_archive.test.log');
const v3 = { migrations: { algorithm: 'v3' } };
const prefix = escapeRegExp(defaultKibanaIndex);

/** The index aliased by `.kibana_migrator`, with its aliases and `_meta`. */
const getKibanaIndex = async (client: ElasticsearchClient) => {
  const [[name, { aliases = {}, mappings = {} }]] = Object.entries(
    await client.indices.get({ index: defaultKibanaIndex })
  );
  return { name, aliases: Object.keys(aliases).sort(), meta: mappings._meta };
};

describe('v3 migrations - upgrading the indices created by v2', () => {
  let esServer: TestElasticsearchUtils['es'];

  if (getFips() !== 0) {
    it('cannot run tests with dataArchives that have a basic license in FIPS mode', () => {
      expect(getFips()).toBe(1);
    });
    return;
  }

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_SMALL });
  });

  afterEach(async () => {
    await esServer?.stop();
  });

  it('updates the indices in place, cleaning up and converting the documents', async () => {
    const { runMigrations, client } = await getCompatibleMigratorTestKit({
      logFilePath,
      settings: v3,
    });
    const before = await client.indices.getAlias({
      name: [defaultKibanaIndex, defaultKibanaTaskIndex],
    });

    await runMigrations();

    // no reindex: v3 keeps using the indices created by v2
    const after = await client.indices.getAlias({
      name: [defaultKibanaIndex, defaultKibanaTaskIndex],
    });
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());

    const [index] = Object.entries(before)
      .filter(([, { aliases }]) => defaultKibanaIndex in aliases)
      .map(([name]) => name);
    expect(index).toMatch(new RegExp(`^${prefix}_\\d+\\.\\d+\\.\\d+_001$`));
    const { [index]: kibana } = await client.indices.get({ index });
    expect(Object.keys(kibana.aliases ?? {})).toEqual(
      expect.arrayContaining([defaultKibanaIndex, `${defaultKibanaIndex}_${nextMinor}`])
    );
    expect(kibana.mappings?._meta).toEqual(
      expect.objectContaining({
        mappingVersions: expect.objectContaining({ complex: '10.2.0' }),
        docVersions: expect.objectContaining({ complex: '10.2.0', basic: '10.1.0' }),
      })
    );
    expect(kibana.mappings?.properties?.complex).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({ createdAt: { type: 'date' } }),
      })
    );

    // removed types are deleted, excluded documents too (the second half of 'complex')
    const counts = await getAggregatedTypesCount(client);
    expect(counts).toEqual({
      basic: BASELINE_DOCUMENTS_PER_TYPE_SMALL,
      old: BASELINE_DOCUMENTS_PER_TYPE_SMALL,
      complex: BASELINE_DOCUMENTS_PER_TYPE_SMALL / 2,
      task: BASELINE_DOCUMENTS_PER_TYPE_SMALL,
    });
    REMOVED_TYPES.forEach((type) => expect(counts).not.toHaveProperty(type));

    // the converted documents are written back: the repository can't tell, it migrates them on read
    const { hits } = await client.search<{ typeMigrationVersion?: string }>({
      index: defaultKibanaIndex,
      query: { term: { type: 'complex' } },
      size: BASELINE_DOCUMENTS_PER_TYPE_SMALL,
    });
    expect(hits.hits.map(({ _source }) => _source?.typeMigrationVersion)).toEqual(
      Array(BASELINE_DOCUMENTS_PER_TYPE_SMALL / 2).fill('10.2.0')
    );

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntries(
      [
        'INIT -> CHECK_CLUSTER_ROUTING_ALLOCATION',
        'CHECK_CLUSTER_ROUTING_ALLOCATION -> WAIT_FOR_YELLOW_SOURCE',
        'UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
        'UPDATE_ALIASES -> INDEX_STATE_UPDATE_DONE',
        'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
        'UPDATE_DOCUMENT_MODEL_VERSIONS -> DONE',
        'Migration completed',
      ].map((entry) => `[${defaultKibanaIndex}] ${entry}`),
      { ordered: true }
    );
  });

  it('fails, listing the documents that could not be converted, and converts them again on the next run', async () => {
    const { runMigrations, client } = await getCompatibleMigratorTestKit({
      logFilePath,
      settings: v3,
      types: getTransformErrorBaselineTypes(REMOVED_TYPES),
    });
    const before = await getKibanaIndex(client);

    await expect(runMigrations()).rejects.toThrow(
      new RegExp(
        `Unable to complete saved object migrations for the \\[${prefix}\\] index: Migrations failed\\. Reason: 1 transformation errors were encountered`
      )
    );

    // the aliases are updated before the documents are converted: the previous Kibana can't start any more
    const failed = await getKibanaIndex(client);
    expect(failed.aliases).toEqual(
      expect.arrayContaining([defaultKibanaIndex, `${defaultKibanaIndex}_${nextMinor}`])
    );
    // the docVersions are left as they were, so the next run converts the documents again
    expect(failed.meta?.docVersions).toEqual(before.meta?.docVersions);

    const { runMigrations: rerun } = await getCompatibleMigratorTestKit({
      logFilePath,
      settings: { migrations: { ...v3.migrations, discardCorruptObjects: nextMinor } },
      types: getTransformErrorBaselineTypes(REMOVED_TYPES),
    });
    await expect(rerun()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'patched' })])
    );
    expect((await getKibanaIndex(client)).meta?.docVersions).toEqual(
      expect.objectContaining({ complex: '10.2.0' })
    );
  });
});
