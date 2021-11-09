/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { i18n } from '@kbn/i18n';
import { getSavedObjects } from './saved_objects';
import { fieldMappings } from './field_mappings';
import { SampleDatasetSchema } from '../../lib/sample_dataset_registry_types';

const flightsName = i18n.translate('home.sampleData.flightsSpecTitle', {
  defaultMessage: 'Sample flight data',
});
const flightsDescription = i18n.translate('home.sampleData.flightsSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for monitoring flight routes.',
});

export const flightsSpecProvider = function (): SampleDatasetSchema {
  return {
    id: 'flights',
    name: flightsName,
    description: flightsDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.png',
    darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard_dark.png',
    overviewDashboard: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'flights',
        dataPath: path.join(__dirname, './flights.json.gz'),
        fields: fieldMappings,
        timeFields: ['timestamp'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
    status: 'not_installed',
    iconPath: '/plugins/home/assets/sample_data_resources/flights/icon.svg',
  };
};
