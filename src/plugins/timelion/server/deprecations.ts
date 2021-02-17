/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecationDependencies } from 'src/plugins/deprecations/server';

export const getDeprecations = async ({ savedObjectsClient }: DeprecationDependencies) => {
  const deprecations = [];

  const getTimelionSheets = () =>
    savedObjectsClient
      .find({
        type: 'timelion-sheet',
        perPage: 1,
      })
      .then(({ total }: { total: number }) => total);

  const timelionWorksheets = await getTimelionSheets();

  if (timelionWorksheets > 0) {
    deprecations.push({
      message: `You have ${timelionWorksheets} Timelion worksheets. The Timelion app will be removed in 8.0. To continue using your Timelion worksheets, migrate them to a dashboard.`,
      documentationUrl:
        'https://www.elastic.co/guide/en/kibana/master/dashboard.html#timelion-deprecation',
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
};
