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
import { auditbeatFieldMappings } from './auditbeat_field_mappings';
import { SampleDatasetSchema } from '../../lib/sample_dataset_registry_types';

const securitysolutionName = i18n.translate('home.sampleData.securitySolutionSpecTitle', {
  defaultMessage: 'Sample Security Solution data',
});
const securitysolutionDescription = i18n.translate(
  'home.sampleData.securitySolutionSpecDescription',
  {
    defaultMessage:
      'Sample data, visualizations, and dashboards for monitoring Security Solution routes.',
  }
);

export const securitySolutionSpecProvider = function (): SampleDatasetSchema {
  return {
    id: 'securitysolution',
    name: securitysolutionName,
    description: securitysolutionDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.webp',
    // darkPreviewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard_dark.webp',
    // overviewDashboard: '',
    defaultIndex: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
    savedObjects: getSavedObjects(),
    dataIndices: [
      {
        id: 'auditbeat',
        dataPath: path.join(__dirname, './auditbeat.json.gz'),
        fields: auditbeatFieldMappings,
        timeFields: ['@timestamp'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
        aliases: {
          'auditbeat-sample-data': {},
        },
      },
    ],
    status: 'not_installed',
    // iconPath: '/plugins/home/assets/sample_data_resources/flights/icon.svg',
  };
};
