/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export interface ConnectorServerSideDefinition {
  iconPath: string;
  isBeta: boolean;
  isNative: boolean;
  isTechPreview?: boolean;
  keywords: string[];
  name: string;
  serviceType: string;
}

/* The consumer should host these icons and transform the iconPath into something usable
 * Enterprise Search and Serverless Search do this right now
 */

export const CONNECTOR_DEFINITIONS: ConnectorServerSideDefinition[] = [
  {
    iconPath: 'azure_blob_storage.svg',
    isBeta: false,
    isNative: true,
    keywords: ['cloud', 'azure', 'blob', 's3', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.azureBlob.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  {
    iconPath: 'confluence_cloud.svg',
    isBeta: false,
    isNative: true,
    keywords: ['confluence', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.confluence.name', {
      defaultMessage: 'Confluence Cloud & Server',
    }),
    serviceType: 'confluence',
  },
  {
    iconPath: 'confluence_cloud.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: true,
    keywords: ['confluence', 'data', 'center', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.confluence_data_center.name', {
      defaultMessage: 'Confluence Data Center',
    }),
    serviceType: 'confluence',
  },
  {
    iconPath: 'dropbox.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: false,
    keywords: ['dropbox', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.dropbox.name', {
      defaultMessage: 'Dropbox',
    }),
    serviceType: 'dropbox',
  },
  {
    iconPath: 'jira_cloud.svg',
    isBeta: false,
    isNative: true,
    keywords: ['jira', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.jira.name', {
      defaultMessage: 'Jira Cloud & Server',
    }),
    serviceType: 'jira',
  },
  {
    iconPath: 'jira_cloud.svg',
    isBeta: false,
    isTechPreview: true,
    isNative: true,
    keywords: ['jira', 'data', 'center', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.jira_data_center.name', {
      defaultMessage: 'Jira Data Center',
    }),
    serviceType: 'jira',
  },
  {
    iconPath: 'github.svg',
    isBeta: false,
    isNative: true,
    keywords: ['github', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.github.name', {
      defaultMessage: 'GitHub & GitHub Enterprise Server',
    }),
    serviceType: 'github',
  },
  {
    iconPath: 'google_cloud_storage.svg',
    isBeta: false,
    isNative: true,
    keywords: ['google', 'cloud', 'blob', 's3', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.googleCloud.name', {
      defaultMessage: 'Google Cloud Storage',
    }),
    serviceType: 'google_cloud_storage',
  },
  {
    iconPath: 'google_drive.svg',
    isBeta: false,
    isNative: true,
    keywords: ['google', 'drive', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.googleDrive.name', {
      defaultMessage: 'Google Drive',
    }),
    serviceType: 'google_drive',
  },
  {
    iconPath: 'mongodb.svg',
    isBeta: false,
    isNative: true,
    keywords: ['mongo', 'mongodb', 'database', 'nosql', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  {
    iconPath: 'mysql.svg',
    isBeta: false,
    isNative: true,
    keywords: ['mysql', 'sql', 'database', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
  {
    iconPath: 'mssql.svg',
    isBeta: false,
    isNative: true,
    keywords: ['mssql', 'microsoft', 'sql', 'database', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.microsoftSQL.name', {
      defaultMessage: 'Microsoft SQL',
    }),
    serviceType: 'mssql',
  },
  {
    iconPath: 'network_drive.svg',
    isBeta: false,
    isNative: true,
    keywords: ['network', 'drive', 'file', 'directory', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
  },
  {
    iconPath: 'notion.svg',
    isBeta: true,
    isNative: false,
    keywords: ['notion', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.notion.name', {
      defaultMessage: 'Notion',
    }),
    serviceType: 'notion',
  },
  {
    iconPath: 'postgresql.svg',
    isBeta: false,
    isNative: true,
    keywords: ['postgresql', 'sql', 'database', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.postgresql.name', {
      defaultMessage: 'PostgreSQL',
    }),
    serviceType: 'postgresql',
  },
  {
    iconPath: 'redis.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['redis', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.redis.name', {
      defaultMessage: 'Redis',
    }),
    serviceType: 'redis',
  },
  {
    iconPath: 'salesforce.svg',
    isBeta: false,
    isNative: true,
    keywords: ['salesforce', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.salesforce.name', {
      defaultMessage: 'Salesforce',
    }),
    serviceType: 'salesforce',
  },
  {
    iconPath: 'servicenow.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: false,
    keywords: ['servicenow', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.serviceNow.name', {
      defaultMessage: 'ServiceNow',
    }),
    serviceType: 'servicenow',
  },
  {
    iconPath: 'sharepoint_online.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: false,
    keywords: ['sharepoint', 'office365', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.sharepoint_online.name', {
      defaultMessage: 'Sharepoint Online',
    }),
    serviceType: 'sharepoint_online',
  },
  {
    iconPath: 'gmail.svg',
    isBeta: true,
    isNative: true,
    keywords: ['gmail', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.gmail.name', {
      defaultMessage: 'Gmail',
    }),
    serviceType: 'gmail',
  },
  {
    iconPath: 'oracle.svg',
    isBeta: true,
    isNative: true,
    keywords: ['oracle', 'sql', 'database', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.oracle.name', {
      defaultMessage: 'Oracle',
    }),
    serviceType: 'oracle',
  },
  {
    iconPath: 'onedrive.svg',
    isBeta: false,
    isNative: true,
    keywords: ['network', 'drive', 'file', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.oneDrive.name', {
      defaultMessage: 'OneDrive',
    }),
    serviceType: 'onedrive',
  },
  {
    iconPath: 's3.svg',
    isBeta: false,
    isNative: true,
    keywords: ['s3', 'cloud', 'amazon', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.s3.name', {
      defaultMessage: 'S3',
    }),
    serviceType: 's3',
  },
  {
    iconPath: 'slack.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['slack', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.slack.name', {
      defaultMessage: 'Slack',
    }),
    serviceType: 'slack',
  },
  {
    iconPath: 'sharepoint_server.svg',
    isBeta: true,
    isNative: false,
    isTechPreview: false,
    keywords: ['sharepoint', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.sharepointServer.name', {
      defaultMessage: 'Sharepoint Server',
    }),
    serviceType: 'sharepoint_server',
  },
  {
    iconPath: 'box.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['cloud', 'box'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.box.name', {
      defaultMessage: 'Box',
    }),
    serviceType: 'box',
  },
  {
    iconPath: 'outlook.svg',
    isBeta: true,
    isNative: true,
    keywords: ['outlook', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.outlook.name', {
      defaultMessage: 'Outlook',
    }),
    serviceType: 'outlook',
  },
  {
    iconPath: 'teams.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['teams', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.teams.name', {
      defaultMessage: 'Teams',
    }),
    serviceType: 'microsoft_teams',
  },
  {
    iconPath: 'zoom.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['zoom', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.zoom.name', {
      defaultMessage: 'Zoom',
    }),
    serviceType: 'zoom',
  },
  {
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: false,
    keywords: ['custom', 'connector', 'code'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.customConnector.name', {
      defaultMessage: 'Customized connector',
    }),
    serviceType: '',
  },
];
