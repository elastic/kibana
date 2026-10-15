/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutSpaceParallelFixture } from '@kbn/scout';
import { DATA_VIEW_TITLE, KBN_ARCHIVE_PATHS, LOGSTASH_TIME_RANGE, UI_SETTINGS } from './constants';
import type { VisualBuilder } from './page_objects';

/**
 * Imports the data views the TSVB specs query and pins the advanced settings and
 * time range the expected values were recorded against, so no spec has to drive
 * the time picker through the UI.
 */
export const setupTsvbSpace = async (scoutSpace: ScoutSpaceParallelFixture): Promise<void> => {
  await scoutSpace.savedObjects.load(KBN_ARCHIVE_PATHS.VISUALIZE);
  await scoutSpace.uiSettings.setDefaultIndex(DATA_VIEW_TITLE.LOGSTASH);
  await scoutSpace.uiSettings.set(UI_SETTINGS);
  await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
};

/**
 * The space is shared by every spec running in the same worker, so each spec has
 * to drop the saved objects and settings it added.
 */
export const cleanupTsvbSpace = async (scoutSpace: ScoutSpaceParallelFixture): Promise<void> => {
  await scoutSpace.uiSettings.unset(
    ...Object.keys(UI_SETTINGS),
    'defaultIndex',
    'timepicker:timeDefaults'
  );
  await scoutSpace.savedObjects.cleanStandardList();
};

/**
 * Opens a new TSVB visualization with the panel configuration every spec starts
 * from: the last (partial) bucket dropped, on the Data tab.
 */
export const openTimeSeriesEditor = async ({
  visualize,
  visualBuilder,
}: {
  visualize: PageObjects['visualize'];
  visualBuilder: VisualBuilder;
}): Promise<void> => {
  await visualize.createTSVBVisualization();
  await visualBuilder.waitForEditorLoaded();
  await visualBuilder.clickPanelOptions('timeSeries');
  await visualBuilder.setDropLastBucket(true);
  await visualBuilder.clickDataTab('timeSeries');
};
