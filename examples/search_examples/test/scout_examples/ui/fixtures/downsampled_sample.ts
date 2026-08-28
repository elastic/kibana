/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';
import {
  DOWNSAMPLED_ARCHIVE,
  SAMPLE_01_DATA_VIEW_TITLE,
  SAMPLE_01_INDEX,
  SAMPLE_01_ROLLUP_INDEX,
} from './constants';

/**
 * Loads the shared sample-01 archive, downsamples into a suite-unique rollup
 * index, and creates the warnings data view. Leaves the archive index in place.
 */
export const ensureDownsampledSample = async ({
  apiServices,
  esArchiver,
  esClient,
  log,
}: Pick<ScoutWorkerFixtures, 'apiServices' | 'esArchiver' | 'esClient' | 'log'>): Promise<void> => {
  log.debug('[setup:search_warnings] loading downsampled archive...');
  await esArchiver.loadIfNeeded(DOWNSAMPLED_ARCHIVE);

  const rollupExists = await esClient.indices.exists({ index: SAMPLE_01_ROLLUP_INDEX });
  if (!rollupExists) {
    await esClient.indices.addBlock({ index: SAMPLE_01_INDEX, block: 'write' });
    await esClient.transport.request({
      method: 'POST',
      path: `/${SAMPLE_01_INDEX}/_downsample/${SAMPLE_01_ROLLUP_INDEX}`,
      body: { fixed_interval: '1h' },
    });
  }

  await apiServices.dataViews.create({
    title: SAMPLE_01_DATA_VIEW_TITLE,
    timeFieldName: '@timestamp',
    override: true,
  });
};

/**
 * Deletes only the rollup this suite created, clears the write block on the
 * shared archive index, and removes the warnings data view.
 */
export const revertDownsampledSample = async ({
  apiServices,
  esClient,
  log,
}: Pick<ScoutWorkerFixtures, 'apiServices' | 'esClient' | 'log'>): Promise<void> => {
  log.debug('[teardown:search_warnings] deleting suite-owned rollup index...');
  await esClient.indices.delete({
    index: SAMPLE_01_ROLLUP_INDEX,
    ignore_unavailable: true,
  });

  const sourceExists = await esClient.indices.exists({ index: SAMPLE_01_INDEX });
  if (sourceExists) {
    log.debug('[teardown:search_warnings] clearing write block on sample-01...');
    await esClient.indices.putSettings({
      index: SAMPLE_01_INDEX,
      settings: { 'index.blocks.write': false },
    });
  }

  await apiServices.dataViews.deleteByTitle(SAMPLE_01_DATA_VIEW_TITLE);
};
