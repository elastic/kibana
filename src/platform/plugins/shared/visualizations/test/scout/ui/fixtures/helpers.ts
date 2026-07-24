/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient, ScoutSpaceParallelFixture } from '@kbn/scout';
import {
  BYTES_FORMAT_PATTERN,
  DEFAULT_INDEX_ID,
  KBN_ARCHIVES,
  LOGSTASH_DEFAULT_TIME,
} from './constants';

const UI_SETTINGS_TO_UNSET = [
  'defaultIndex',
  'format:bytes:defaultPattern',
  'histogram:maxBars',
  'timepicker:timeDefaults',
];

/**
 * Per-space setup mirroring the legacy FTR `visualize.initTests()` +
 * `timePicker.setDefaultAbsoluteRangeViaUiSettings()`: loads the shared Visualize
 * saved objects (index patterns + saved searches) and applies the UI settings the
 * data-table assertions rely on (default index, byte format, histogram max bars,
 * default time range).
 */
export const loadVisualizeSuiteDefaults = async (scoutSpace: ScoutSpaceParallelFixture) => {
  await scoutSpace.savedObjects.load(KBN_ARCHIVES.VISUALIZE);
  await scoutSpace.uiSettings.set({
    defaultIndex: DEFAULT_INDEX_ID,
    'format:bytes:defaultPattern': BYTES_FORMAT_PATTERN,
    'histogram:maxBars': 100,
  });
  await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_DEFAULT_TIME);
};

/** Per-space teardown: unset the suite UI settings and clean loaded saved objects. */
export const cleanupVisualizeSuiteDefaults = async (scoutSpace: ScoutSpaceParallelFixture) => {
  await scoutSpace.uiSettings.unset(...UI_SETTINGS_TO_UNSET);
  await scoutSpace.savedObjects.cleanStandardList();
};

/**
 * Deletes every index matching `pattern`. Scout's esArchiver is load-only, so the
 * sequential no-data suite removes indices directly to reach an empty-cluster state.
 * `action.destructive_requires_name` rejects wildcard deletes, so resolve the concrete
 * index names first (a read, which allows wildcards) and delete those by name.
 */
export const deleteIndicesByPattern = async (
  esClient: EsClient,
  pattern: string
): Promise<void> => {
  const existing = await esClient.indices.get({
    index: pattern,
    allow_no_indices: true,
    ignore_unavailable: true,
  });
  const indices = Object.keys(existing);
  if (indices.length === 0) {
    return;
  }
  await esClient.indices.delete({ index: indices });
};
