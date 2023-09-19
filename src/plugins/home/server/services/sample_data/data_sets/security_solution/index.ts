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
    defaultMessage: 'Sample data, visualizations, and dashboards for exploring Security Solution.',
  }
);
const securitysolutionAlertsIngestPipelineDescription = i18n.translate(
  'home.sampleData.securitySolutionSpecAlertsIngestPipelineDescription',
  {
    defaultMessage:
      'This set kibana.space_ids to current space and adjust @timestamp field to the time when data was ingested.',
  }
);

const securitysolutionIngestPipelineDescription = i18n.translate(
  'home.sampleData.securitySolutionSpecAuditbeatIngestPipelineDescription',
  {
    defaultMessage: 'This adjust @timestamp field to the time when data was ingested.',
  }
);

export const securitySolutionSpecProvider = function (spaceId = 'default'): SampleDatasetSchema {
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
          description: securitysolutionIngestPipelineDescription,
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
        id: 'logs',
        dataPath: path.join(__dirname, './logs.json.gz'),
        fields: alertsFieldMappings,
        timeFields: ['@timestamp', 'alert.actions.createdAt'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
        deleteAliasWhenRemoved: true,
        aliases: {
          'logs-sample-data': {},
        },
        indexSettings: {
          default_pipeline: 'Security_Solution_logs_sample_data_ingest_pipeline',
          mapping: {
            total_fields: {
              limit: 6000,
            },
          },
        },
        pipeline: {
          id: 'Security_Solution_logs_sample_data_ingest_pipeline',
          description: securitysolutionIngestPipelineDescription,
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
        dynamicTemplates: [
          {
            'container.labels': {
              path_match: 'container.labels.*',
              mapping: {
                type: 'keyword',
              },
              match_mapping_type: 'string',
            },
          },
          {
            'winlog.user_data': {
              path_match: 'winlog.user_data.*',
              mapping: {
                type: 'keyword',
              },
              match_mapping_type: 'string',
            },
          },
          {
            'winlog.event_data': {
              path_match: 'winlog.user_data.*',
              mapping: {
                type: 'keyword',
              },
              match_mapping_type: 'string',
            },
          },
          {
            strings_as_keyword: {
              mapping: {
                type: 'keyword',
              },
              match_mapping_type: 'string',
            },
          },
        ],
        timeFields: ['@timestamp', 'alert.actions.createdAt', 'updated_at', 'alert.createdAt'],
        currentTimeMarker: '2018-01-09T00:00:00',
        preserveDayOfWeekTimeOfDay: true,
        aliases: {
          [`.alerts-security.alerts-${spaceId}`]: {},
        },
        deleteAliasWhenRemoved: false,
        indexSettings: {
          default_pipeline: 'Security_Solution_alerts_sample_data_ingest_pipeline',
          mapping: {
            total_fields: {
              limit: 6000,
            },
          },
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
                field: 'kibana.alert.workflow_status',
                value: ['open'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'kibana.alert.severity',
                value: ['critical'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'kibana.alert.rule.uuid',
                value: ['6cd9adb6-f751-4add-868f-cfce6e408f32'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'kibana.alert.rule.name',
                value: ['Malware Prevention Alert'],
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
                field: 'alert.createdAt',
                value: ['{{ _ingest.timestamp }}'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'updated_at',
                value: ['{{ _ingest.timestamp }}'],
                ignore_failure: true,
              },
            },
            {
              set: {
                field: 'event.ingested',
                value: ['{{_ingest.timestamp}}'],
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
          ],
        },
      },
    ],
    status: 'not_installed',
  };
};
