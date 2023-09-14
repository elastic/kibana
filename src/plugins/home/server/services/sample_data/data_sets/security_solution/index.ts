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
const securitysolutionAlertsIngestPipelineDescription = i18n.translate(
  'home.sampleData.securitySolutionSpecAlertsIngestPipelineDescription',
  {
    defaultMessage:
      'This set kibana.space_ids to current space and adjust @timestamp field to the time when data was ingested.',
  }
);

const securitysolutionAuditbeatIngestPipelineDescription = i18n.translate(
  'home.sampleData.securitySolutionSpecAuditbeatIngestPipelineDescription',
  {
    defaultMessage: 'This adjust @timestamp field to the time when data was ingested.',
  }
);

export const securitySolutionSpecProvider: (spaceId?: string) => SampleDatasetSchema = function (
  spaceId = 'default'
): SampleDatasetSchema {
  return {
    id: 'securitysolution',
    name: securitysolutionName,
    description: securitysolutionDescription,
    previewImagePath: '/plugins/home/assets/sample_data_resources/security_solution/siem.png',
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
        deleteAliasWhenRemoved: true,
        aliases: {
          'auditbeat-sample-data': {},
        },
        indexSettings: {
          default_pipeline: 'Security_Solution_auditbeat_sample_data_ingest_pipeline',
        },
        pipeline: {
          id: 'Security_Solution_auditbeat_sample_data_ingest_pipeline',
          description: securitysolutionAuditbeatIngestPipelineDescription,
          processors: [
            {
              set: {
                field: '@timestamp',
                value: ['{{ _ingest.timestamp }}'],
                ignore_failure: true,
              },
            },
          ],
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
        indexSettings: {
          default_pipeline: 'Security_Solution_alerts_sample_data_ingest_pipeline',
        },
        pipeline: {
          id: 'Security_Solution_alerts_sample_data_ingest_pipeline',
          description: securitysolutionAlertsIngestPipelineDescription,
          processors: [
            {
              set: {
                field: 'kibana.space_ids',
                value: [spaceId],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: '@timestamp',
                value: ['{{ _ingest.timestamp }}'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'alert.actions.createdAt',
                value: ['{{ _ingest.timestamp }}'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'agent.type',
                value: ['endpoint'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'event.kind',
                value: ['signal'],
                ignore_failure: true,
              },
            },
          ],
        },
      },
    ],
    status: 'not_installed',
  };
};
