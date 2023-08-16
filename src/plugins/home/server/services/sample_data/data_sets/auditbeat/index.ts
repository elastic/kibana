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

const auditbeatName = i18n.translate('home.sampleData.auditbeatSpecTitle', {
  defaultMessage: 'Sample auditbeat data',
});
const auditbeatDescription = i18n.translate('home.sampleData.auditbeatSpecDescription', {
  defaultMessage: 'Sample data, visualizations, and dashboards for monitoring auditbeat routes.',
});

export const auditbeatSpecProvider = function (): SampleDatasetSchema {
  return {
    id: 'auditbeat',
    index: 'auditbeat-sample-data',
    name: auditbeatName,
    description: auditbeatDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.webp',
    // darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard_dark.webp',
    // overviewDashboard: '',
    defaultIndex: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'auditbeat',
        dataPath: path.join(__dirname, './auditbeat.json.gz'),
        fields: fieldMappings,
        timeFields: ['@timestamp'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
    status: 'not_installed',
    iconPath: '/plugins/home/assets/sample_data_resources/flights/icon.svg',
  };
};
