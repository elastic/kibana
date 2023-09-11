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
import { alertsFieldMappings } from './alerts_field_mappings';

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

export const securitySolutionSpecProvider: (spaceId?: string) => SampleDatasetSchema = function (
  spaceId = 'default'
): SampleDatasetSchema {
  return {
    id: 'securitysolution',
    name: securitysolutionName,
    description: securitysolutionDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/flights/dashboard.webp',
    overviewDashboard: '6b348ca0-4e45-11ee-8ec1-71bbd0b34722',
    defaultIndex: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
    savedObjects: getSavedObjects(spaceId),
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
      {
        id: 'alerts',
        dataPath: path.join(__dirname, './alerts.json.gz'),
        fields: alertsFieldMappings,
        timeFields: ['@timestamp', 'alert.actions.createdAt'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
        aliases: {
          [`.alerts-security.alerts-${spaceId}`]: {},
        },
        deleteAliasWhenRemoved: false,
      },
    ],
    status: 'not_installed',
  };
};
