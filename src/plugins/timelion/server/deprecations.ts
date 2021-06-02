/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreStart,
  SavedObjectsClient,
  Logger,
  GetDeprecationsContext,
  DeprecationsDetails,
} from 'src/core/server';

export const getTimelionSheetsCount = async (
  savedObjectsClient: Pick<SavedObjectsClient, 'find'>
) => {
  const { total } = await savedObjectsClient.find({ type: 'timelion-sheet', perPage: 1 });
  return total;
};

export const showWarningMessageIfTimelionSheetWasFound = async (
  core: CoreStart,
  logger: Logger
) => {
  const { savedObjects } = core;
  const savedObjectsClient = savedObjects.createInternalRepository();
  const count = await getTimelionSheetsCount(savedObjectsClient);
  if (count > 0) {
    logger.warn(
      'Deprecated since 7.0, the Timelion app will be removed in the last 7.x minor version. To continue using your Timelion worksheets, migrate them to a dashboard. See https://www.elastic.co/guide/en/kibana/current/create-panels-with-timelion.html.'
    );
  }
};

/**
 * Deprecated since 7.0, the Timelion app will be removed in 8.0.
 * To continue using your Timelion worksheets, migrate them to a dashboard.
 *
 *  @link https://www.elastic.co/guide/en/kibana/master/timelion.html#timelion-deprecation
 **/
export async function getDeprecations({
  savedObjectsClient,
}: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
  const deprecations: DeprecationsDetails[] = [];
  const count = await getTimelionSheetsCount(savedObjectsClient);

  if (count > 0) {
    deprecations.push({
      message: `You have ${count} Timelion worksheets. The Timelion app will be removed in the last 7.x minor version. To continue using your Timelion worksheets, migrate them to a dashboard.`,
      documentationUrl:
        'https://www.elastic.co/guide/en/kibana/current/create-panels-with-timelion.html',
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          'Navigate to the Kibana Dashboard and click "Create dashboard".',
          'Select Timelion from the "New Visualization" window.',
          'Open a new tab, open the Timelion app, select the chart you want to copy, then copy the chart expression.',
          'Go to Timelion, paste the chart expression in the Timelion expression field, then click Update.',
          'In the toolbar, click Save.',
          'On the Save visualization window, enter the visualization Title, then click Save and return.',
        ],
      },
    });
  }

  return deprecations;
}
