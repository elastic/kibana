/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { DisplayType, FeatureName, FieldType, NativeConnector } from './connectors';

// assigning these to a local var significantly improves bundle size
// because it reduces references to the imported modules.
const { translate } = i18n;
const { TEXTBOX, TEXTAREA, NUMERIC, TOGGLE, DROPDOWN } = DisplayType;
const {
  SYNC_RULES,
  INCREMENTAL_SYNC,
  DOCUMENT_LEVEL_SECURITY,
  FILTERING_ADVANCED_CONFIG,
  FILTERING_RULES,
} = FeatureName;
const { STRING, LIST, INTEGER, BOOLEAN } = FieldType;

const USERNAME_LABEL = translate('searchConnectors.nativeConnectors.usernameLabel', {
  defaultMessage: 'Username',
});

const PASSWORD_LABEL = translate('searchConnectors.nativeConnectors.passwordLabel', {
  defaultMessage: 'Password',
});

const ENABLE_SSL_LABEL = translate('searchConnectors.nativeConnectors.enableSSL.label', {
  defaultMessage: 'Enable SSL',
});

const SSL_CERTIFICATE_LABEL = translate('searchConnectors.nativeConnectors.sslCertificate.label', {
  defaultMessage: 'SSL certificate',
});

const RETRIES_PER_REQUEST_LABEL = translate(
  'searchConnectors.nativeConnectors.retriesPerRequest.label',
  {
    defaultMessage: 'Retries per request',
  }
);

const ADVANCED_RULES_IGNORED_LABEL = translate(
  'searchConnectors.nativeConnectors.advancedRulesIgnored.label',
  {
    defaultMessage: 'This configurable field is ignored when Advanced Sync Rules are used.',
  }
);

const MAX_CONCURRENT_DOWNLOADS_LABEL = translate(
  'searchConnectors.nativeConnectors.nativeConnectors.maximumConcurrentLabel',
  {
    defaultMessage: 'Maximum concurrent downloads',
  }
);

const USE_TEXT_EXTRACTION_SERVICE_LABEL = translate(
  'searchConnectors.nativeConnectors.textExtractionService.label',
  {
    defaultMessage: 'Use text extraction service',
  }
);

const USE_TEXT_EXTRACTION_SERVICE_TOOLTIP = translate(
  'searchConnectors.nativeConnectors.textExtractionService.tooltip',
  {
    defaultMessage:
      'Requires a separate deployment of the Elastic Data Extraction Service. ' +
      'Also requires that pipeline settings disable text extraction.',
  }
);

const ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL = translate(
  'searchConnectors.nativeConnectors.enableDLS.label',
  {
    defaultMessage: 'Enable document level security',
  }
);

const getEnableDocumentLevelSecurityTooltip = (serviceName: string) =>
  translate('searchConnectors.nativeConnectors.enableDLS.tooltip', {
    defaultMessage:
      'Document level security ensures identities and permissions set in {serviceName} are maintained in Elasticsearch. This enables you to restrict and personalize read-access users and groups have to documents in this index. Access control syncs ensure this metadata is kept up to date in your Elasticsearch documents.',
    values: { serviceName },
  });

const DATABASE_LABEL = translate('searchConnectors.nativeConnectors.databaseLabel', {
  defaultMessage: 'Database',
});

const SCHEMA_LABEL = translate('searchConnectors.nativeConnectors.schemaLabel', {
  defaultMessage: 'Schema',
});

const PORT_LABEL = translate('searchConnectors.nativeConnectors.portLabel', {
  defaultMessage: 'Port',
});

const PERSONAL_ACCESS_TOKEN = 'personal_access_token';

const GITHUB_APP = 'github_app';

const BOX_FREE = 'box_free';
const BOX_ENTERPRISE = 'box_enterprise';

export const NATIVE_CONNECTOR_DEFINITIONS: Record<string, NativeConnector | undefined> = {
  azure_blob_storage: {
    configuration: {
      account_name: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.azureBlobStorage.accountNameLabel', {
          defaultMessage: 'Account name',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      account_key: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.azureBlobStorage.accountKeyLabel', {
          defaultMessage: 'Account key',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      blob_endpoint: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.azureBlobStorage.blobEndpointLabel', {
          defaultMessage: 'Blob endpoint',
        }),
        options: [],
        order: 3,
        placeholder: 'http://127.0.0.1:10000/devstoreaccount',
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      containers: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.azureBlobStorage.containerNameLabel', {
          defaultMessage: 'List of containers',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: null,
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 6,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            type: 'less_than',
            constraint: 101,
          },
        ],
        value: 100,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.azureBlobStorage.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  box: {
    configuration: {
      is_enterprise: {
        default_value: BOX_FREE,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.box.accountType', {
          defaultMessage: 'Box Account',
        }),
        options: [
          {
            label: translate('searchConnectors.nativeConnectors.box.boxFreeAccount', {
              defaultMessage: 'Box Free Account',
            }),
            value: BOX_FREE,
          },
          {
            label: translate('searchConnectors.nativeConnectors.box.boxEnterpriseAccount', {
              defaultMessage: 'Box Enterprise Account',
            }),
            value: BOX_ENTERPRISE,
          },
        ],
        required: true,
        sensitive: false,
        tooltip: null,
        order: 1,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: BOX_FREE,
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.box.clientIdLabel', {
          defaultMessage: 'Client ID',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_secret: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.box.clientSecretLabel', {
          defaultMessage: 'Client Secret',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      refresh_token: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.box.refreshTokenLabel', {
          defaultMessage: 'Refresh token',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      enterprise_id: {
        default_value: null,
        depends_on: [{ field: 'is_enterprise', value: BOX_ENTERPRISE }],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.box.enterpriseIdLabel', {
          defaultMessage: 'Enterprise ID',
        }),
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 6,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
    },
    features: {},
    name: translate('searchConnectors.nativeConnectors.box.name', {
      defaultMessage: 'Box',
    }),
    serviceType: 'box',
  },
  confluence: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.confluenceSource.label', {
          defaultMessage: 'Confluence data source',
        }),
        options: [
          {
            label: translate('searchConnectors.nativeConnectors.confluenceCloud.name', {
              defaultMessage: 'Confluence Cloud',
            }),
            value: 'confluence_cloud',
          },
          {
            label: translate('searchConnectors.nativeConnectors.confluenceServer.name', {
              defaultMessage: 'Confluence Server',
            }),
            value: 'confluence_server',
          },
          {
            label: translate('searchConnectors.nativeConnectors.confluenceDataCenter.name', {
              defaultMessage: 'Confluence Data Center',
            }),
            value: 'confluence_data_center',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'confluence_server',
      },
      username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceServer.usernameLabel', {
          defaultMessage: 'Confluence Server username',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceServer.passwordLabel', {
          defaultMessage: 'Confluence Server password',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      data_center_username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_data_center',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceDataCenter.usernameLabel', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      data_center_password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_data_center',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceDataCenter.passwordLabel', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      account_email: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceCloud.accountEmailLabel', {
          defaultMessage: 'Confluence Cloud account email',
        }),
        options: [],
        order: 6,
        placeholder: 'me@example.com',
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      api_token: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluenceServer.apiTokenLabel', {
          defaultMessage: 'Confluence Cloud API token',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      confluence_url: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.confluence.urlLabel', {
          defaultMessage: 'Confluence URL label',
        }),
        options: [],
        order: 8,
        placeholder: 'http://127.0.0.1:5000',
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      spaces: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.confluence.spaceKeysLabel', {
          defaultMessage: 'Confluence space keys',
        }),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: ADVANCED_RULES_IGNORED_LABEL,
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      index_labels: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.confluence.indexLabelsLabel', {
          defaultMessage: 'Enable indexing labels',
        }),
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.confluence.indexLabelsTooltip', {
          defaultMessage:
            'Enabling this will increase the amount of network calls to the source, and may decrease performance',
        }),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: null,
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 13,
        required: false,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 50,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 14,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            constraint: 51,
            type: 'less_than',
          },
        ],
        value: 50,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_cloud',
          },
        ],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 15,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.confluence.tooltipName', {
            defaultMessage: 'Confluence',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 16,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.confluence.name', {
      defaultMessage: 'Confluence',
    }),
    serviceType: 'confluence',
  },
  dropbox: {
    configuration: {
      path: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: 'Path to fetch files/folders',
        options: [],
        order: 1,
        required: false,
        sensitive: false,
        tooltip: 'This configurable field is ignored when Advanced Sync Rules are used.',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '/',
      },
      app_key: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: 'App key',
        options: [],
        order: 2,
        placeholder: '',
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      app_secret: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: 'App secret',
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      refresh_token: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: 'Refresh token',
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: 'Retries per request',
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: NUMERIC,
        label: 'Maximum concurrent downloads',
        options: [],
        order: 6,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 100,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.dropbox.tooltipName', {
            defaultMessage: 'Dropbox',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      include_inherited_users_and_groups: {
        default_value: null,
        depends_on: [{ field: 'use_document_level_security', value: true }],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.dropbox.includeInheritedUsersAndGroups.label',
          {
            defaultMessage: 'Include groups and inherited users',
          }
        ),
        options: [],
        order: 9,
        required: false,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.dropbox.includeInheritedUsersAndGroups.tooltip',
          {
            defaultMessage:
              'Include groups and inherited users when indexing permissions. Enabling this configurable field will cause a significant performance degradation.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.dropbox.name', {
      defaultMessage: 'Dropbox',
    }),
    serviceType: 'dropbox',
  },
  github: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.github.label', {
          defaultMessage: 'Data source',
        }),
        options: [
          {
            label: translate('searchConnectors.nativeConnectors.github.options.cloudLabel', {
              defaultMessage: 'GitHub Cloud',
            }),
            value: 'github_cloud',
          },
          {
            label: translate('searchConnectors.nativeConnectors.github.options.cloudServer', {
              defaultMessage: 'GitHub Server',
            }),
            value: 'github_server',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'github_server',
      },
      host: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'github_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.github.url.label', {
          defaultMessage: 'Server URL',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      auth_method: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.github.authMethod.label', {
          defaultMessage: 'Authentication method',
        }),
        options: [
          {
            label: translate(
              'searchConnectors.nativeConnectors.github.options.personalAccessToken',
              {
                defaultMessage: 'Personal access token',
              }
            ),
            value: PERSONAL_ACCESS_TOKEN,
          },
          {
            label: translate('searchConnectors.nativeConnectors.github.options.githubApp', {
              defaultMessage: 'GitHub App',
            }),
            value: GITHUB_APP,
          },
        ],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: PERSONAL_ACCESS_TOKEN,
      },
      token: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: PERSONAL_ACCESS_TOKEN,
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.github.token.label', {
          defaultMessage: 'Token',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      repo_type: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.github.repo_type.label', {
          defaultMessage: 'Repository Type',
        }),
        options: [
          {
            label: translate('searchConnectors.nativeConnectors.github.options.organization', {
              defaultMessage: 'Organization',
            }),
            value: 'organization',
          },
          {
            label: translate('searchConnectors.nativeConnectors.github.options.other', {
              defaultMessage: 'Other',
            }),
            value: 'other',
          },
        ],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.github.repo_type', {
          defaultMessage:
            'The Document Level Security feature is not available for the Other Repository Type',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'other',
      },
      org_name: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: PERSONAL_ACCESS_TOKEN,
          },
          {
            field: 'repo_type',
            value: 'organization',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.github.org_name.label', {
          defaultMessage: 'Organization Name',
        }),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      app_id: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: GITHUB_APP,
          },
        ],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.github.appID.label', {
          defaultMessage: 'App ID',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      private_key: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: GITHUB_APP,
          },
        ],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.github.privateKey.label', {
          defaultMessage: 'App private key',
        }),
        options: [],
        order: 8,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      repositories: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.github.listOfRepos.label', {
          defaultMessage: 'List of repositories',
        }),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.github.listOfRepos.tooltip', {
          defaultMessage: 'This configurable field is ignored when Advanced Sync Rules are used.',
        }),
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: null,
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 12,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 13,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [
          {
            field: 'repo_type',
            value: 'organization',
          },
        ],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 14,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.github.configuration.useDocumentLevelSecurityTooltip',
          {
            defaultMessage:
              'Document level security ensures identities and permissions set in GitHub are maintained in Elasticsearch. This enables you to restrict and personalize read-access users and groups have to documents in this index. Access control syncs ensure this metadata is kept up to date in your Elasticsearch documents.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    name: translate('searchConnectors.nativeConnectors.github.name', {
      defaultMessage: 'Github',
    }),
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    serviceType: 'github',
  },
  gmail: {
    configuration: {
      service_account_credentials: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate(
          'searchConnectors.nativeConnectors.gmail.service_account_credentials.label',
          {
            defaultMessage: 'GMail service account JSON',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      subject: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.gmail.subject.label', {
          defaultMessage: 'Google Workspace admin email',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.gmail.subject.tooltip', {
          defaultMessage: 'Admin account email address',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [
          {
            type: 'regex',
            constraint: '^\\S+@\\S+\\.\\S+$',
          },
        ],
        value: '',
      },
      customer_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.gmail.customer_id.label', {
          defaultMessage: 'Google customer id',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.gmail.customer_id.tooltip', {
          defaultMessage: 'Google admin console -> Account -> Settings -> Customer Id',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      include_spam_and_trash: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.gmail.include_spam_and_trash.label', {
          defaultMessage: 'Include spam and trash emails',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.gmail.include_spam_and_trash.tooltip',
          {
            defaultMessage: 'Will include spam and trash emails, when set to true.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.gmail.use_document_level_security.label',
          {
            defaultMessage: 'Enable document level security',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.gmail.use_document_level_security.tooltip',
          {
            defaultMessage:
              'Document level security ensures identities and permissions set in GMail are maintained in Elasticsearch. This enables you to restrict and personalize read-access users have to documents in this index. Access control syncs ensure this metadata is kept up to date in your Elasticsearch documents.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.gmail.name', {
      defaultMessage: 'Gmail',
    }),
    serviceType: 'gmail',
  },
  google_cloud_storage: {
    features: {
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    configuration: {
      buckets: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.googleCloudStorage.bucketNameLabel', {
          defaultMessage: 'List of buckets',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      service_account_credentials: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.googleCloudStorage.label', {
          defaultMessage: 'Google Cloud service account JSON',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.googleCloudStorage.retry.label', {
          defaultMessage: 'Maximum retries for failed requests',
        }),
        options: [],
        order: 3,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    name: translate('searchConnectors.content.nativeConnectors.googleCloud.name', {
      defaultMessage: 'Google Cloud Storage',
    }),
    serviceType: 'google_cloud_storage',
  },
  google_drive: {
    configuration: {
      service_account_credentials: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.gdrive.label', {
          defaultMessage: 'Google Drive service account JSON',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: true,
        tooltip: translate('searchConnectors.nativeConnectors.gdrive.tooltip', {
          defaultMessage:
            'This connectors authenticates as a service account to synchronize content from Google Drive.',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      use_domain_wide_delegation_for_sync: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.gdrive.useDomainWideDelegation.label', {
          defaultMessage: 'Use domain-wide delegation for data sync',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.gdrive.useDomainWideDelegation.tooltip',
          {
            defaultMessage:
              'Enable domain-wide delegation to automatically sync content from all shared and personal drives in the Google workspace. This eliminates the need to manually share Google Drive data with your service account, though it may increase sync time. If disabled, only items and folders manually shared with the service account will be synced. Please refer to the connector documentation to ensure domain-wide delegation is correctly configured and has the appropriate scopes.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      google_workspace_admin_email_for_data_sync: {
        default_value: null,
        depends_on: [
          {
            field: 'use_domain_wide_delegation_for_sync',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.gdrive.workspaceAdminEmailDataSync.label',
          {
            defaultMessage: 'Google Workspace admin email',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.gdrive.workspaceAdminEmailDataSync.tooltip',
          {
            defaultMessage:
              'Provide the admin email to be used with domain-wide delegation for data sync. This email enables the connector to utilize the Admin Directory API for listing organization users. Please refer to the connector documentation to ensure domain-wide delegation is correctly configured and has the appropriate scopes.',
          }
        ),
        type: STRING,
        ui_restrictions: [],
        validations: [
          {
            type: 'regex',
            constraint: '^\\S+@\\S+\\.\\S+$',
          },
        ],
        value: '',
      },
      google_workspace_email_for_shared_drives_sync: {
        default_value: null,
        depends_on: [
          {
            field: 'use_domain_wide_delegation_for_sync',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.gdrive.workspaceEmailSharedDrivesSync.label',
          {
            defaultMessage: 'Google Workspace email for syncing shared drives',
          }
        ),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.gdrive.workspaceEmailSharedDrivesSync.tooltip',
          {
            defaultMessage:
              'Provide the Google Workspace user email for discovery and syncing of shared drives. Only the shared drives this user has access to will be synced.',
          }
        ),
        type: STRING,
        ui_restrictions: [],
        validations: [
          {
            type: 'regex',
            constraint: '^\\S+@\\S+\\.\\S+$',
          },
        ],
        value: '',
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.gdrive.tooltipName', {
            defaultMessage: 'Google Drive',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      google_workspace_admin_email: {
        default_value: null,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
          {
            field: 'use_domain_wide_delegation_for_sync',
            value: false,
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.gdrive.workspaceAdminEmail.label', {
          defaultMessage: 'Google Workspace admin email',
        }),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.gdrive.workspaceAdminEmail.tooltip', {
          defaultMessage:
            'In order to use Document Level Security you need to enable Google Workspace domain-wide delegation of authority for your service account. A service account with delegated authority can impersonate admin user with sufficient permissions to fetch all users and their corresponding permissions.',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [
          {
            type: 'regex',
            constraint: '^\\S+@\\S+\\.\\S+$',
          },
        ],
        value: '',
      },
      max_concurrency: {
        default_value: 25,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.gdrive.maxHTTPRequest.label', {
          defaultMessage: 'Maximum concurrent HTTP requests',
        }),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.gdrive.maxHTTPRequest.tooltip', {
          defaultMessage:
            'This setting determines the maximum number of concurrent HTTP requests sent to the Google API to fetch data. Increasing this value can improve data retrieval speed, but it may also place higher demands on system resources and network bandwidth.',
        }),
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            type: 'greater_than',
            constraint: 0,
          },
        ],
        value: '',
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.google_drive.name', {
      defaultMessage: 'Google Drive',
    }),
    serviceType: 'google_drive',
  },
  jira: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.jira.dataSourceLabel', {
          defaultMessage: 'Jira data source',
        }),
        options: [
          {
            label: translate('searchConnectors.nativeConnectors.jira.jiraCloudLabel', {
              defaultMessage: 'Jira Cloud',
            }),
            value: 'jira_cloud',
          },
          {
            label: translate('searchConnectors.nativeConnectors.jira.jiraServerLabel', {
              defaultMessage: 'Jira Server',
            }),
            value: 'jira_server',
          },
          {
            label: translate('searchConnectors.nativeConnectors.jira.jiraDataCenterLabel', {
              defaultMessage: 'Jira Data Center',
            }),
            value: 'jira_data_center',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'jira_cloud',
      },
      username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.serverUsername', {
          defaultMessage: 'Jira Server username',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.serverPasswordLabel', {
          defaultMessage: 'Jira Server password',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'changeme',
      },
      data_center_username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_data_center',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.dataCenterUsername', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      data_center_password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_data_center',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.dataCenterPasswordLabel', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'changeme',
      },
      account_email: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.cloudServiceAccountLabel', {
          defaultMessage: 'Jira Cloud email address',
        }),
        options: [],
        order: 6,
        placeholder: 'me@example.com',
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.jira.cloudServiceAccountTooltip', {
          defaultMessage:
            'Email address associated with Jira Cloud account. E.g. jane.doe@gmail.com',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      api_token: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.cloudApiTokenLabel', {
          defaultMessage: 'Jira Cloud API token',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'abc#123',
      },
      jira_url: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.jira.hostUrlLabel', {
          defaultMessage: 'Jira host url',
        }),
        options: [],
        order: 8,
        placeholder: 'http://127.0.0.1:8080',
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      projects: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.jira.projectKeysLabel', {
          defaultMessage: 'Jira project keys',
        }),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: ADVANCED_RULES_IGNORED_LABEL,
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: null,
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 12,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 13,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            type: 'less_than',
            constraint: 101,
          },
        ],
        value: 100,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 14,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.jiraTooltip.name', {
            defaultMessage: 'Jira',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 15,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.jira.name', {
      defaultMessage: 'Jira',
    }),
    serviceType: 'jira',
  },
  microsoft_teams: {
    configuration: {
      tenant_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.microsoftTeams.tenantIdLabel', {
          defaultMessage: 'Tenant ID',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.microsoftTeams.clientIdLabel', {
          defaultMessage: 'Client ID',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      secret_value: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.microsoftTeams.secretValueLabel', {
          defaultMessage: 'Secret value',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      username: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
    },
    features: {},
    name: translate('searchConnectors.nativeConnectors.microsoftTeams.name', {
      defaultMessage: 'Microsoft Teams',
    }),
    serviceType: 'microsoft_teams',
  },
  mongodb: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mongodb.configuration.hostLabel', {
          defaultMessage: 'Server hostname',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      user: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 2,
        required: false,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 3,
        required: false,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      collection: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      direct_connection: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.sslEnabledLabel',
          {
            defaultMessage: 'SSL/TLS Connection',
          }
        ),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.sslEnabledTooltip',
          {
            defaultMessage:
              'This option establishes a secure connection to the MongoDB server using SSL/TLS encryption. Ensure that your MongoDB deployment supports SSL/TLS connections. Enable if MongoDB cluster uses DNS SRV records.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mongodb.configuration.sslCaLabel', {
          defaultMessage: 'Certificate Authority (.pem)',
        }),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.mongodb.configuration.sslCaTooltip', {
          defaultMessage:
            'Specifies the root certificate from the Certificate Authority. The value of the certificate is used to validate the certificate presented by the MongoDB instance.',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tls_insecure: {
        default_value: false,
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.tlsInsecureLabel',
          {
            defaultMessage: 'Skip certificate verification',
          }
        ),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.mongodb.configuration.tlsInsecureTooltip',
          {
            defaultMessage:
              "This option skips certificate validation for TLS/SSL connections to your MongoDB server. We strongly recommend setting this option to 'disable'.",
          }
        ),
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [FILTERING_ADVANCED_CONFIG]: true,
      [FILTERING_RULES]: true,
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  mssql: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.hostLabel', {
          defaultMessage: 'Host',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 1433,
      },
      username: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.usernameLabel', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.passwordLabel', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.tablesLabel', {
          defaultMessage: 'Comma-separated list of tables',
        }),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: '',
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      schema: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.schemaLabel', {
          defaultMessage: 'Schema',
        }),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'dbo',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.rowsFetchedLabel', {
          defaultMessage: 'Rows fetched per request',
        }),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.mssql.configuration.retriesLabel', {
          defaultMessage: 'Retries per request',
        }),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      validate_host: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.mssql.configuration.validateHostLabel',
          {
            defaultMessage: 'Validate host',
          }
        ),
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: '',
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.mssql.name', {
      defaultMessage: 'Microsoft SQL',
    }),
    serviceType: 'mssql',
  },
  mysql: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.hostLabel', {
          defaultMessage: 'Host',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      user: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.usernameLabel', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 3,
        required: false,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.passwordLabel', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 4,
        required: false,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.tablesLabel', {
          defaultMessage: 'Comma-separated list of tables',
        }),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: '',
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.rowsFetchedLabel', {
          defaultMessage: 'Rows fetched per request',
        }),
        options: [],
        order: 9,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.mysql.configuration.retriesLabel', {
          defaultMessage: 'Retries per request',
        }),
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
  network_drive: {
    configuration: {
      username: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      server_ip: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.networkDrive.ipAddressLabel', {
          defaultMessage: 'IP address',
        }),
        options: [],
        order: 3,
        placeholder: '127.0.0.1',
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      server_port: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 445,
      },
      drive_path: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.networkDrive.pathLabel', {
          defaultMessage: 'Path',
        }),
        options: [],
        order: 5,
        placeholder: 'Folder1',
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.networkDriveTooltip.name', {
            defaultMessage: 'Network drive',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
  },
  notion: {
    configuration: {
      notion_secret_key: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.notion.notionSecretKeyLabel', {
          defaultMessage: 'Notion Secret Key',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      databases: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.notion.databasesLabel', {
          defaultMessage: 'List of Databases',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      pages: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.notion.pagesLabel', {
          defaultMessage: 'List of Pages',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      index_comments: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.notion.indexCommentsLabel', {
          defaultMessage: 'Enable indexing comments',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.notion.indexCommentsTooltip', {
          defaultMessage:
            'Enabling this will increase the amount of network calls to the source, and may decrease performance',
        }),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      concurrent_downloads: {
        default_value: 30,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.notion.name', {
      defaultMessage: 'Notion',
    }),
    serviceType: 'notion',
  },
  onedrive: {
    configuration: {
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oneDrive.azureClientId.label', {
          defaultMessage: 'Azure application Client ID',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_secret: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oneDrive.azureClientSecret.label', {
          defaultMessage: 'Azure application Client Secret',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tenant_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oneDrive.tenantId.label', {
          defaultMessage: 'Azure application Tenant ID',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 4,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      concurrent_downloads: {
        default_value: 15,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.oneDriveTooltip.name', {
            defaultMessage: 'OneDrive',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    name: translate('searchConnectors.nativeConnectors.onedrive.name', {
      defaultMessage: 'OneDrive',
    }),
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    serviceType: 'onedrive',
  },
  oracle: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.hostLabel', {
          defaultMessage: 'Host',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.portLabel', {
          defaultMessage: 'Port',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      username: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.usernameLabel', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.passwordLabel', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.databaseLabel', {
          defaultMessage: 'Database',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.tablesLabel', {
          defaultMessage: 'Comma-separated list of tables',
        }),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.oracle.configuration.fetch_sizeLabel', {
          defaultMessage: 'Rows fetched per request',
        }),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: translate(
          'searchConnectors.nativeConnectors.oracle.configuration.retry_countLabel',
          {
            defaultMessage: 'Retries per request',
          }
        ),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      oracle_protocol: {
        default_value: 'TCP',
        depends_on: [],
        display: DROPDOWN,
        label: translate(
          'searchConnectors.nativeConnectors.oracle.configuration.oracle_protocolLabel',
          {
            defaultMessage: 'Oracle connection protocol',
          }
        ),
        options: [
          {
            label: 'TCP',
            value: 'TCP',
          },
          {
            label: 'TCPS',
            value: 'TCPS',
          },
        ],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 'TCP',
      },
      oracle_home: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.oracle.configuration.oracle_homeLabel',
          {
            defaultMessage: 'Path to Oracle Home',
          }
        ),
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      wallet_configuration_path: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.oracle.configuration.wallet_configuration_pathLabel',
          {
            defaultMessage: 'Path to SSL Wallet configuration files',
          }
        ),
        options: [],
        order: 11,
        required: false,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.oracle.name', {
      defaultMessage: 'Oracle',
    }),
    serviceType: 'oracle',
  },
  outlook: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate('searchConnectors.nativeConnectors.outlook.data_source.label', {
          defaultMessage: 'Outlook data source',
        }),
        options: [
          {
            label: 'Outlook Cloud',
            value: 'outlook_cloud',
          },
          {
            label: 'Outlook Server',
            value: 'outlook_server',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'outlook_cloud',
      },
      tenant_id: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.tenant_id.label', {
          defaultMessage: 'Tenant ID',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.client_id.label', {
          defaultMessage: 'Client ID',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_secret: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_cloud',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.client_secret.label', {
          defaultMessage: 'Client Secret Value',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      exchange_server: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.exchange_server.label', {
          defaultMessage: 'Exchange Server',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.outlook.exchange_server.tooltip', {
          defaultMessage: "Exchange server's IP address. E.g. 127.0.0.1",
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      active_directory_server: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.outlook.active_directory_server.label',
          {
            defaultMessage: 'Active Directory Server',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.outlook.active_directory_server.tooltip',
          {
            defaultMessage: "Active Directory server's IP address. E.g. 127.0.0.1",
          }
        ),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.username.label', {
          defaultMessage: 'Exchange server username',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.password.label', {
          defaultMessage: 'Exchange server password',
        }),
        options: [],
        order: 8,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      domain: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.domain.label', {
          defaultMessage: 'Exchange server domain name',
        }),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.outlook.domain.tooltip', {
          defaultMessage: 'Domain name such as gmail.com, outlook.com',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
        ],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.outlook.ssl_enabled.label', {
          defaultMessage: 'Enable SSL',
        }),
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: null,
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'outlook_server',
          },
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.outlook.ssl_ca.label', {
          defaultMessage: 'SSL certificate',
        }),
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.outlook.use_text_extraction_service.label',
          {
            defaultMessage: 'Use text extraction service',
          }
        ),
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.outlook.use_text_extraction_service.toolip',
          {
            defaultMessage:
              'Requires a separate deployment of the Elastic Text Extraction Service. Requires that pipeline settings disable text extraction.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 13,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.outlookTooltip.name', {
            defaultMessage: 'Outlook',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.outlook.name', {
      defaultMessage: 'Outlook',
    }),
    serviceType: 'outlook',
  },
  postgresql: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.postgresql.configuration.hostLabel', {
          defaultMessage: 'Host',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 5432,
      },
      username: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      schema: {
        default_value: '',
        depends_on: [],
        display: TEXTBOX,
        label: SCHEMA_LABEL,
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.nativeConnectors.postgresql.configuration.tablesLabel', {
          defaultMessage: 'Comma-separated list of tables',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: '',
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: NUMERIC,
        label: translate(
          'searchConnectors.nativeConnectors.postgresql.configuration.rowsFetchedLabel',
          {
            defaultMessage: 'Rows fetched per request',
          }
        ),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: translate(
          'searchConnectors.nativeConnectors.postgresql.configuration.retriesLabel',
          {
            defaultMessage: 'Retries per request',
          }
        ),
        options: [],
        order: 9,
        required: false,
        sensitive: false,
        tooltip: '',
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.nativeConnectors.postgresql.name', {
      defaultMessage: 'PostgreSQL',
    }),
    serviceType: 'postgresql',
  },
  s3: {
    configuration: {
      buckets: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate('searchConnectors.content.nativeConnectors.s3.buckets.label', {
          defaultMessage: 'AWS Buckets',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.content.nativeConnectors.s3.buckets.tooltip', {
          defaultMessage: 'AWS Buckets are ignored when Advanced Sync Rules are used.',
        }),
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      aws_access_key_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.content.nativeConnectors.s3.accessKey.label', {
          defaultMessage: 'AWS Access Key Id',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      aws_secret_access_key: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.content.nativeConnectors.s3.secretKey.label', {
          defaultMessage: 'AWS Secret Key',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      read_timeout: {
        default_value: 90,
        depends_on: [],
        display: NUMERIC,

        label: translate('searchConnectors.content.nativeConnectors.s3.readTimeout.label', {
          defaultMessage: 'Read timeout',
        }),
        options: [],
        order: 4,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      connect_timeout: {
        default_value: 90,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.content.nativeConnectors.s3.connectTimeout.label', {
          defaultMessage: 'Connection timeout',
        }),
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      max_attempts: {
        default_value: 5,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.content.nativeConnectors.s3.maxAttempts.label', {
          defaultMessage: 'Maximum retry attempts',
        }),
        options: [],
        order: 6,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      page_size: {
        default_value: 100,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.content.nativeConnectors.s3.maxPageSize.label', {
          defaultMessage: 'Maximum size of page',
        }),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: '',
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: translate('searchConnectors.content.nativeConnectors.s3.name', {
      defaultMessage: 'S3',
    }),
    serviceType: 's3',
  },
  salesforce: {
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    configuration: {
      domain: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.content.nativeConnectors.salesforce.domain.label', {
          defaultMessage: 'Domain',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.content.nativeConnectors.salesforce.domain.tooltip', {
          defaultMessage:
            "The domain for your Salesforce instance. If your Salesforce URL is 'https://foo.salesforce.com', the domain would be 'foo'.",
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.content.nativeConnectors.salesforce.clientId.label', {
          defaultMessage: 'Client ID',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: translate(
          'searchConnectors.content.nativeConnectors.salesforce.clientId.tooltip',
          {
            defaultMessage:
              "The client id for your OAuth2-enabled connected app. Also called 'consumer key'",
          }
        ),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_secret: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.content.nativeConnectors.salesforce.clientSecret.label',
          { defaultMessage: 'Client Secret' }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: translate(
          'searchConnectors.content.nativeConnectors.salesforce.clientSecret.tooltip',
          {
            defaultMessage:
              "The client secret for your OAuth2-enabled connected app. Also called 'consumer secret'",
          }
        ),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.salesforce.name', {
            defaultMessage: 'Salesforce',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    name: translate('searchConnectors.content.nativeConnectors.salesforce.name', {
      defaultMessage: 'Salesforce',
    }),
    serviceType: 'salesforce',
  },
  servicenow: {
    configuration: {
      url: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.servicenow.url.label', {
          defaultMessage: 'Service URL',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'http://127.0.0.1:9318',
      },
      username: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.servicenow.username.label', {
          defaultMessage: 'Username',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.servicenow.password.label', {
          defaultMessage: 'Password',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      services: {
        default_value: null,
        depends_on: [],
        label: translate('searchConnectors.nativeConnectors.servicenow.services.label', {
          defaultMessage: 'Comma-separated list of services',
        }),
        display: TEXTAREA,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.servicenow.services.tooltip', {
          defaultMessage: 'List of services is ignored when Advanced Sync Rules are used.',
        }),
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 10,
        depends_on: [],
        display: NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 6,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 10,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.servicenow.configuration.useDocumentLevelSecurityTooltip',
          {
            defaultMessage:
              'Document level security ensures identities and permissions set in ServiceNow are maintained in Elasticsearch. This enables you to restrict and personalize read-access users and groups have to documents in this index. Access control syncs ensure this metadata is kept up to date in your Elasticsearch documents.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.servicenow.name', {
      defaultMessage: 'ServiceNow',
    }),
    serviceType: 'servicenow',
  },
  sharepoint_online: {
    configuration: {
      tenant_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.tenantIdLabel',
          {
            defaultMessage: 'Tenant ID',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tenant_name: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.tenantNameLabel',
          {
            defaultMessage: 'Tenant name',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.clientIdLabel',
          {
            defaultMessage: 'Client ID',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      auth_method: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.authMethodLabel',
          {
            defaultMessage: 'Authentication Method',
          }
        ),
        options: [
          {
            label: translate(
              'searchConnectors.nativeConnectors.sharepoint_online.configuration.authMethod.clientSecretLabel',
              {
                defaultMessage: 'Client Secret',
              }
            ),
            value: 'secret',
          },
          {
            label: translate(
              'searchConnectors.nativeConnectors.sharepoint_online.configuration.authMethod.certificateLabel',
              {
                defaultMessage: 'Certificate',
              }
            ),
            value: 'certificate',
          },
        ],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'certificate',
      },
      secret_value: {
        default_value: null,
        depends_on: [{ field: 'auth_method', value: 'secret' }],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.secretValueLabel',
          {
            defaultMessage: 'Secret value',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      certificate: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: 'certificate',
          },
        ],
        display: TEXTAREA,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.certificateLabel',
          {
            defaultMessage: 'Content of certificate file',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      private_key: {
        default_value: null,
        depends_on: [
          {
            field: 'auth_method',
            value: 'certificate',
          },
        ],
        display: TEXTAREA,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.privateKeyLabel',
          {
            defaultMessage: 'Content of private key file',
          }
        ),
        options: [],
        order: 7,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      site_collections: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.siteCollectionsLabel',
          {
            defaultMessage: 'Comma-separated list of sites',
          }
        ),
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.siteCollectionsTooltip',
          {
            defaultMessage:
              'A comma-separated list of sites to ingest data from. ' +
              'Use * to include all available sites.',
          }
        ),
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      enumerate_all_sites: {
        default_value: true,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.enumerateAllSitesLabel',
          { defaultMessage: 'Enumerate all sites?' }
        ),
        options: [],
        order: 9,
        required: false,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.enumerateAllSitesTooltip',
          {
            defaultMessage:
              'If enabled, sites will be fetched in bulk, then filtered down to the configured list of sites. This is efficient when syncing many sites. If disabled, each configured site will be fetched with an individual request. This is efficient when syncing fewer sites.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      fetch_subsites: {
        default_value: false,
        depends_on: [{ field: 'enumerate_all_sites', value: false }],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchSubsitesLabel',
          {
            defaultMessage: 'Fetch sub-sites of configured sites?',
          }
        ),
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchSubsitesTooltip',
          {
            defaultMessage:
              'Whether subsites of the configured site(s) should be automatically fetched.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: false,
        depends_on: [],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.useDocumentLevelSecurityLabel',
          {
            defaultMessage: 'Enable document level security',
          }
        ),
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.useDocumentLevelSecurityTooltip',
          {
            defaultMessage:
              'Document level security ensures identities and permissions set in Sharepoint Online are maintained in Elasticsearch. This metadata is added to your Elasticsearch documents, so you can control user and group read-access. Access control syncs ensure this metadata is kept up to date.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      fetch_drive_item_permissions: {
        default_value: true,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchDriveItemPermissionsLabel',
          {
            defaultMessage: 'Fetch drive item permissions',
          }
        ),
        options: [],
        order: 13,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchDriveItemPermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch drive item specific permissions. This setting can increase sync time.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      fetch_unique_page_permissions: {
        default_value: true,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniquePagePermissionsLabel',
          {
            defaultMessage: 'Fetch unique page permissions',
          }
        ),
        options: [],
        order: 14,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniquePagePermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch unique page permissions. This setting can increase sync time. If this setting is disabled a page will inherit permissions from its parent site.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      fetch_unique_list_permissions: {
        default_value: true,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniqueListPermissionsLabel',
          {
            defaultMessage: 'Fetch unique list permissions',
          }
        ),
        options: [],
        order: 15,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniqueListPermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch unique list permissions. This setting can increase sync time. If this setting is disabled a list will inherit permissions from its parent site.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      fetch_unique_list_item_permissions: {
        default_value: true,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniqueListItemPermissionsLabel',
          {
            defaultMessage: 'Fetch unique list item permissions',
          }
        ),
        options: [],
        order: 16,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_online.configuration.fetchUniqueListItemPermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch unique list item permissions. This setting can increase sync time. If this setting is disabled a list item will inherit permissions from its parent site.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.sharepoint_online.name', {
      defaultMessage: 'Sharepoint Online',
    }),
    serviceType: 'sharepoint_online',
  },
  sharepoint_server: {
    configuration: {
      authentication: {
        default_value: null,
        depends_on: [],
        display: DROPDOWN,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.authentication',
          {
            defaultMessage: 'Authentication',
          }
        ),
        options: [
          {
            label: translate(
              'searchConnectors.nativeConnectors.sharepoint_server.options.basicLabel',
              {
                defaultMessage: 'Basic',
              }
            ),
            value: 'basic_auth',
          },
          {
            label: translate(
              'searchConnectors.nativeConnectors.sharepoint_server.options.ntlmLabel',
              {
                defaultMessage: 'NTLM',
              }
            ),
            value: 'ntlm_auth',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: 'basic_auth',
      },
      username: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.username',
          {
            defaultMessage: 'SharePoint Server username',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.password',
          {
            defaultMessage: 'SharePoint Server password',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      host_url: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.sharepoint_server.configuration.host', {
          defaultMessage: 'SharePoint host',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: '',
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      site_collections: {
        default_value: null,
        depends_on: [],
        display: TEXTAREA,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.site_collections',
          {
            defaultMessage: 'Comma-separated list of SharePoint site collections to index',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: null,
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: null,
        type: INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: ENABLE_DOCUMENT_LEVEL_SECURITY_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: getEnableDocumentLevelSecurityTooltip(
          translate('searchConnectors.nativeConnectors.sharepoint_server.name', {
            defaultMessage: 'Sharepoint Server',
          })
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      fetch_unique_list_permissions: {
        default_value: null,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.fetchUniqueListPermissionsLabel',
          {
            defaultMessage: 'Fetch unique list permissions',
          }
        ),
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.fetchUniqueListPermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch unique list permissions. This setting can increase sync time. If this setting is disabled a list will inherit permissions from its parent site.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
      fetch_unique_list_item_permissions: {
        default_value: null,
        depends_on: [
          {
            field: 'use_document_level_security',
            value: true,
          },
        ],
        display: TOGGLE,
        label: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.fetchUniqueListItemPermissionsLabel',
          {
            defaultMessage: 'Fetch unique list item permissions',
          }
        ),
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.sharepoint_server.configuration.fetchUniqueListItemPermissionsTooltip',
          {
            defaultMessage:
              'Enable this option to fetch unique list item permissions. This setting can increase sync time. If this setting is disabled a list item will inherit permissions from its parent site.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
    },
    features: {
      [SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
      [DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: translate('searchConnectors.nativeConnectors.sharepoint_server.name', {
      defaultMessage: 'Sharepoint Server',
    }),
    serviceType: 'sharepoint_server',
  },
  slack: {
    configuration: {
      token: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.slack.token.label', {
          defaultMessage: 'Authentication Token',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: true,
        tooltip: translate('searchConnectors.nativeConnectors.slack.token.tooltip', {
          defaultMessage:
            'The Slack Authentication Token for the slack application you created. See the docs for details.',
        }),
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_last_n_days: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.slack.fetchLastNDays.label', {
          defaultMessage: 'Days of message history to fetch',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.slack.fetchLastNDays.tooltip', {
          defaultMessage:
            'How far back in time to request message history from slack. Messages older than this will not be indexed.',
        }),
        type: INTEGER,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      auto_join_channels: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.slack.autoJoinChannels.label', {
          defaultMessage: 'Automatically join channels',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.slack.autoJoinChannels.tooltip', {
          defaultMessage:
            'The Slack application bot will only be able to read conversation history from channels it has joined. The default requires it to be manually invited to channels. Enabling this allows it to automatically invite itself into all public channels.',
        }),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      sync_users: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.slack.syncUsers.label', {
          defaultMessage: 'Sync users',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.slack.syncUsers.tooltip', {
          defaultMessage:
            'Whether or not Slack Users should be indexed as documents in Elasticsearch.',
        }),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: true,
      },
    },
    features: {},
    name: translate('searchConnectors.nativeConnectors.slack.name', {
      defaultMessage: 'Slack',
    }),
    serviceType: 'slack',
  },
  zoom: {
    configuration: {
      account_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.zoom.accountId.label', {
          defaultMessage: 'Account ID',
        }),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.zoom.clientId.label', {
          defaultMessage: 'Client ID',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_secret: {
        default_value: null,
        depends_on: [],
        display: TEXTBOX,
        label: translate('searchConnectors.nativeConnectors.zoom.clientSecret.label', {
          defaultMessage: 'Client secret',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_past_meeting_details: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: translate('searchConnectors.nativeConnectors.zoom.fetchPastMeetingDetails.label', {
          defaultMessage: 'Fetch past meeting details',
        }),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: translate(
          'searchConnectors.nativeConnectors.zoom.fetchPastMeetingDetails.tooltip',
          {
            defaultMessage:
              'Enable this option to fetch past past meeting details. This setting can increase sync time.',
          }
        ),
        type: BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      recording_age: {
        default_value: null,
        depends_on: [],
        display: NUMERIC,
        label: translate('searchConnectors.nativeConnectors.zoom.recordingAge.label', {
          defaultMessage: 'Recording Age Limit (Months)',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: translate('searchConnectors.nativeConnectors.zoom.recordingAge.tooltip', {
          defaultMessage:
            'How far back in time to request recordings from zoom. Recordings older than this will not be indexed.',
        }),
        type: INTEGER,
        ui_restrictions: [],
        validations: [
          {
            type: 'greater_than',
            constraint: -1,
          },
        ],
        value: '',
      },
      use_text_extraction_service: {
        default_value: null,
        depends_on: [],
        display: TOGGLE,
        label: USE_TEXT_EXTRACTION_SERVICE_LABEL,
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: USE_TEXT_EXTRACTION_SERVICE_TOOLTIP,
        type: BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
    },
    features: {},
    name: translate('searchConnectors.nativeConnectors.zoom.name', {
      defaultMessage: 'Zoom',
    }),
    serviceType: 'zoom',
  },
};
