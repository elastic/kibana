/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsServiceStart } from 'src/core/server';

export const getDeprecations = async (savedObjects: SavedObjectsServiceStart) => {
  const deprecations = [];
  // const savedObjectsClient = savedObjects.createInternalRepository();

  // const getTimelionSheets = () =>
  //   savedObjectsClient
  //     .find({
  //       type: 'timelion-sheet',
  //       perPage: 1,
  //     })
  //     .then(({ total }) => total);

  // const timelionWorksheets = await getTimelionSheets();

  // if (timelionWorksheets > 0) {
  //   deprecations.push({
  //     message: `You have ${timelionWorksheets} Timelion worksheets. The Timelion app will be removed in 8.0. To continue using your Timelion worksheets, migrate them to a dashboard.`,
  //     documentationUrl:
  //       'https://www.elastic.co/guide/en/kibana/master/dashboard.html#timelion-deprecation',
  //     level: 'warning',
  //   });
  // }

  deprecations.push({
    message: `You have 1 Timelion worksheets. The Timelion app will be removed in 8.0. To continue using your Timelion worksheets, migrate them to a dashboard.`,
    documentationUrl:
      'https://www.elastic.co/guide/en/kibana/master/dashboard.html#timelion-deprecation',
    level: 'warning',
  });

  return deprecations;
};
