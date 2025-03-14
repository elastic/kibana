/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  ConnectorClientSideDefinition,
  ConnectorServerSideDefinition,
} from '../types/connector_definition';

import { docLinks } from './doc_links';

export const MANAGED_CONNECTOR_INDEX_PREFIX = 'content-';

// needs to be a function because, docLinks are only populated with actual
// documentation links in browser after SearchConnectorsPlugin starts
export const getConnectorsDict = (): Record<string, ConnectorClientSideDefinition> => ({
  azure_blob_storage: {
    docsUrl: docLinks.connectorsAzureBlobStorage,
    externalAuthDocsUrl: 'https://learn.microsoft.com/azure/storage/common/authorize-data-access',
    externalDocsUrl: 'https://learn.microsoft.com/azure/storage/blobs/',
    platinumOnly: true,
  },
  box: {
    docsUrl: docLinks.connectorsBox,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  confluence: {
    docsUrl: docLinks.connectorsConfluence,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  custom: {
    docsUrl: docLinks.connectors,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
  },
  dropbox: {
    docsUrl: docLinks.connectorsDropbox,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  github: {
    docsUrl: docLinks.connectorsGithub,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  gmail: {
    docsUrl: docLinks.connectorsGmail,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  google_cloud_storage: {
    docsUrl: docLinks.connectorsGoogleCloudStorage,
    externalAuthDocsUrl: 'https://cloud.google.com/storage/docs/authentication',
    externalDocsUrl: 'https://cloud.google.com/storage/docs',
    platinumOnly: true,
  },
  google_drive: {
    docsUrl: docLinks.connectorsGoogleDrive,
    externalAuthDocsUrl: 'https://cloud.google.com/iam/docs/service-account-overview',
    externalDocsUrl: 'https://developers.google.com/drive',
    platinumOnly: true,
  },
  jira: {
    docsUrl: docLinks.connectorsJira,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  microsoft_teams: {
    docsUrl: docLinks.connectorsTeams,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  mongodb: {
    docsUrl: docLinks.connectorsMongoDB,
    externalAuthDocsUrl: 'https://www.mongodb.com/docs/atlas/app-services/authentication/',
    externalDocsUrl: 'https://www.mongodb.com/docs/',
    platinumOnly: true,
  },
  mssql: {
    docsUrl: docLinks.connectorsMicrosoftSQL,
    externalAuthDocsUrl:
      'https://learn.microsoft.com/sql/relational-databases/security/authentication-access/getting-started-with-database-engine-permissions',
    externalDocsUrl: 'https://learn.microsoft.com/sql/',
    platinumOnly: true,
  },
  mysql: {
    docsUrl: docLinks.connectorsMySQL,
    externalDocsUrl: 'https://dev.mysql.com/doc/',
    platinumOnly: true,
  },
  network_drive: {
    docsUrl: docLinks.connectorsNetworkDrive,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  notion: {
    docsUrl: docLinks.connectorsNotion,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  onedrive: {
    docsUrl: docLinks.connectorsOneDrive,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  oracle: {
    docsUrl: docLinks.connectorsOracle,
    externalAuthDocsUrl:
      'https://docs.oracle.com/en/database/oracle/oracle-database/19/dbseg/index.html',
    externalDocsUrl: 'https://docs.oracle.com/database/oracle/oracle-database/',
    platinumOnly: true,
  },
  outlook: {
    docsUrl: docLinks.connectorsOutlook,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  postgresql: {
    docsUrl: docLinks.connectorsPostgreSQL,
    externalAuthDocsUrl: 'https://www.postgresql.org/docs/15/auth-methods.html',
    externalDocsUrl: 'https://www.postgresql.org/docs/',
    platinumOnly: true,
  },
  redis: {
    docsUrl: docLinks.connectorsRedis,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  s3: {
    docsUrl: docLinks.connectorsS3,
    externalAuthDocsUrl: 'https://docs.aws.amazon.com/s3/index.html',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  salesforce: {
    docsUrl: docLinks.connectorsSalesforce,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  servicenow: {
    docsUrl: docLinks.connectorsServiceNow,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  sharepoint_online: {
    docsUrl: docLinks.connectorsSharepointOnline,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  sharepoint_server: {
    docsUrl: docLinks.connectorsSharepoint,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  slack: {
    docsUrl: docLinks.connectorsSlack,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  zoom: {
    docsUrl: docLinks.connectorsZoom,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
});

/* The consumer should host these icons and transform the iconPath into something usable
 * Enterprise Search and Serverless Search do this right now
 */
export const CONNECTOR_DEFINITIONS: ConnectorServerSideDefinition[] = [
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.azureBlob.description', {
      defaultMessage: 'Search over your content on Azure Blob Storage.',
    }),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.confluence.description',
      {
        defaultMessage: 'Search over your content on Confluence Cloud.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.confluenceDataCenter.description',
      {
        defaultMessage: 'Search over your content on Confluence Data Center.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'datastore', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.dropbox.description', {
      defaultMessage: 'Search over your files and folders stored on Dropbox.',
    }),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'jira'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.jira.description', {
      defaultMessage: 'Search over your content on Jira Cloud.',
    }),
    iconPath: 'jira_cloud.svg',
    isBeta: false,
    isNative: true,
    keywords: ['jira', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.jira.name', {
      defaultMessage: 'Jira Cloud',
    }),
    serviceType: 'jira',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'jira'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.jiraServer.description',
      {
        defaultMessage: 'Search over your content on Jira Server.',
      }
    ),
    iconPath: 'jira_server.svg',
    isBeta: false,
    isNative: false,
    keywords: ['jira', 'server', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.jiraServer.name', {
      defaultMessage: 'Jira Server',
    }),
    serviceType: 'jira',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.jiraDataCenter.description',
      {
        defaultMessage: 'Search over your content on Jira Data Center.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.github.description', {
      defaultMessage: 'Search over your projects and repos on GitHub.',
    }),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.googleCloud.description',
      {
        defaultMessage: 'Search over your content on Google Cloud Storage.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.googleDrive.description',
      {
        defaultMessage: 'Search over your content on Google Drive.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.graphQL.description', {
      defaultMessage: 'Search over your content with GraphQL.',
    }),
    iconPath: 'graphql.svg',
    isBeta: false,
    isNative: false,
    keywords: ['graphql', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.graphQL.name', {
      defaultMessage: 'GraphQL',
    }),
    serviceType: 'graphql',
    isTechPreview: true,
  },
  {
    categories: ['search', 'datastore', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.mongoDB.description', {
      defaultMessage: 'Search over your MongoDB content.',
    }),
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
    categories: ['search', 'datastore', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.mysql.description', {
      defaultMessage: 'Search over your MySQL content.',
    }),
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
    categories: ['search', 'custom', 'elastic_stack', 'datastore', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.msSql.description', {
      defaultMessage: 'Search over your content on Microsoft SQL Server.',
    }),
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
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.netowkrDrive.description',
      {
        defaultMessage: 'Search over your Network Drive content.',
      }
    ),
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.notion.description', {
      defaultMessage: 'Search over your content on Notion.',
    }),
    iconPath: 'notion.svg',
    isBeta: false,
    isNative: true,
    keywords: ['notion', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.notion.name', {
      defaultMessage: 'Notion',
    }),
    serviceType: 'notion',
  },
  {
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.postgreSQL.description',
      {
        defaultMessage: 'Search over your content on PostgreSQL.',
      }
    ),
    categories: ['search', 'elastic_stack', 'custom', 'datastore', 'connector', 'connector_client'],
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
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.redis.description', {
      defaultMessage: 'Search over your content on Redis.',
    }),
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
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.salesforce.description',
      {
        defaultMessage: 'Search over your content on Salesforce.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'custom', 'datastore', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.salesforceSandbox.description',
      {
        defaultMessage: 'Search over your content on Salesforce Sandbox.',
      }
    ),
    iconPath: 'salesforce.svg',
    isBeta: false,
    isNative: true,
    keywords: ['salesforce', 'cloud', 'connector', 'sandbox'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.salesforceBox.name', {
      defaultMessage: 'Salesforce Sandbox',
    }),
    serviceType: 'salesforce',
  },
  {
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.serviceNow.description',
      {
        defaultMessage: 'Search over your content on ServiceNow.',
      }
    ),
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
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.sharepointOnline.description',
      {
        defaultMessage: 'Search over your content on SharePoint Online.',
      }
    ),
    iconPath: 'sharepoint_online.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: false,
    keywords: ['sharepoint', 'office365', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.sharepointOnline.name', {
      defaultMessage: 'Sharepoint Online',
    }),
    serviceType: 'sharepoint_online',
  },
  {
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.gmail.description', {
      defaultMessage: 'Search over your content on Gmail.',
    }),
    iconPath: 'gmail.svg',
    isBeta: false,
    isNative: true,
    keywords: ['gmail', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.gmail.name', {
      defaultMessage: 'Gmail',
    }),
    serviceType: 'gmail',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'datastore', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.oracle.description', {
      defaultMessage: 'Search over your content on Oracle.',
    }),
    iconPath: 'oracle.svg',
    isBeta: false,
    isNative: true,
    keywords: ['oracle', 'sql', 'database', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.oracle.name', {
      defaultMessage: 'Oracle',
    }),
    serviceType: 'oracle',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'datastore', 'connector', 'connector_client'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.oneDrive.description', {
      defaultMessage: 'Search over your content on OneDrive.',
    }),
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
    description: i18n.translate('searchConnectors.content.nativeConnectors.s3.description', {
      defaultMessage: 'Search over your content on Amazon S3.',
    }),
    categories: ['search', 'datastore', 'elastic_stack', 'connector', 'connector_client'],
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
    description: i18n.translate('searchConnectors.content.nativeConnectors.slack.description', {
      defaultMessage: 'Search over your content on Slack.',
    }),
    categories: ['search', 'elastic_stack', 'connector', 'connector_client'],
    iconPath: 'slack.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: true,
    keywords: ['slack', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.slack.name', {
      defaultMessage: 'Slack',
    }),
    serviceType: 'slack',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.sharepointServer.description',
      {
        defaultMessage: 'Search over your content on SharePoint Server.',
      }
    ),
    iconPath: 'sharepoint_server.svg',
    isBeta: true,
    isNative: true,
    isTechPreview: false,
    keywords: ['sharepoint', 'cloud', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.sharepointServer.name', {
      defaultMessage: 'Sharepoint Server',
    }),
    serviceType: 'sharepoint_server',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'box'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.box.description', {
      defaultMessage: 'Search over your content on Box.',
    }),
    iconPath: 'box.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: true,
    keywords: ['cloud', 'box'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.box.name', {
      defaultMessage: 'Box',
    }),
    serviceType: 'box',
  },
  {
    description: i18n.translate('searchConnectors.content.nativeConnectors.outlook.description', {
      defaultMessage: 'Search over your content on Outlook.',
    }),
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'outlook'],
    iconPath: 'outlook.svg',
    isBeta: false,
    isNative: true,
    keywords: ['outlook', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.outlook.name', {
      defaultMessage: 'Outlook',
    }),
    serviceType: 'outlook',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'teams'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.teams.description', {
      defaultMessage: 'Search over your content on Teams.',
    }),
    iconPath: 'teams.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: true,
    keywords: ['teams', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.teams.name', {
      defaultMessage: 'Teams',
    }),
    serviceType: 'microsoft_teams',
  },
  {
    categories: ['search', 'elastic_stack', 'custom', 'connector', 'connector_client', 'zoom'],
    description: i18n.translate('searchConnectors.content.nativeConnectors.zoom.description', {
      defaultMessage: 'Search over your content on Zoom.',
    }),
    iconPath: 'zoom.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: true,
    keywords: ['zoom', 'connector'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.zoom.name', {
      defaultMessage: 'Zoom',
    }),
    serviceType: 'zoom',
  },
  {
    categories: ['search', 'custom', 'elastic_stack', 'connector', 'connector_client'],
    description: i18n.translate(
      'searchConnectors.content.nativeConnectors.customConnector.description',
      {
        defaultMessage: 'Search over data stored on custom data sources.',
      }
    ),
    iconPath: 'custom.svg',
    isBeta: false,
    isNative: false,
    keywords: ['custom', 'connector', 'code'],
    name: i18n.translate('searchConnectors.content.nativeConnectors.customConnector.name', {
      defaultMessage: 'Customized connector',
    }),
    serviceType: '',
  },
];
