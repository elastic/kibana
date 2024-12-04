/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-nocheck
import {
  Connector,
  ConnectorStats,
  ConnectorStatus,
  ConnectorSyncJob,
  SyncJobType,
  SyncStatus,
  TriggerMethod,
} from '..';

const now = Date.now();

export const spoConnector: Connector = {
  id: '1',
  index_name: 'search_spo',
  is_native: false,
  status: ConnectorStatus.CONNECTED,
  service_type: 'sharepoint_online',
  last_indexed_document_count: 1000,
  pipeline: {
    extract_binary_content: false,
    name: 'ent-search-generic-ingestion',
    reduce_whitespace: true,
    run_ml_inference: false,
  },
  scheduling: {
    access_control: {
      enabled: true,
      interval: '0 0 0 * * ?',
    },
    full: {
      enabled: true,
      interval: '0 0 0 * * ?',
    },
    incremental: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
  },
  configuration: {
    use_document_level_security: {
      value: true,
    },
    use_text_extraction_service: {
      value: true,
    },
    site_collections: {
      value: 'test-site',
    },
  },
  filtering: [
    {
      active: {
        advanced_snippet: {
          value: {},
        },
        rules: [
          {
            id: 'DEFAULT',
          },
          {
            id: 'NEW',
          },
        ],
      },
      domain: 'DEFAULT',
      draft: {
        advanced_snippet: {
          value: {
            id: 'NEW',
          },
        },
        rules: [
          {
            id: 'DEFAULT',
          },
        ],
      },
    },
  ],
};

export const mysqlConnector: Connector = {
  id: '2',
  index_name: 'search_mysql',
  is_native: true,
  status: ConnectorStatus.ERROR,
  service_type: 'mysql',
  last_indexed_document_count: 2000,
  pipeline: {
    extract_binary_content: true,
    name: 'ent-search-generic-ingestion',
    reduce_whitespace: true,
    run_ml_inference: false,
  },
  scheduling: {
    access_control: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
    full: {
      enabled: true,
      interval: '0 0 0 * * ?',
    },
    incremental: {
      enabled: false,
      interval: '0 0 0 * * ?',
    },
  },
  configuration: {
    use_document_level_security: {
      value: false,
    },
    use_text_extraction_service: {
      value: false,
    },
    tables: {
      value: '*',
    },
    ssl_enabled: {
      value: true,
    },
  },
  filtering: [
    {
      active: {
        advanced_snippet: {
          value: {},
        },
        rules: [
          {
            id: 'DEFAULT',
          },
        ],
      },
      domain: 'DEFAULT',
      draft: {
        advanced_snippet: {
          value: {},
        },
        rules: [
          {
            id: 'DEFAULT',
          },
        ],
      },
    },
  ],
};

export const spoFullSyncJob: ConnectorSyncJob = {
  id: '1',
  job_type: SyncJobType.FULL,
  status: SyncStatus.COMPLETED,
  trigger_method: TriggerMethod.SCHEDULED,
  connector: {
    id: spoConnector.id,
    configuration: {
      use_text_extraction_service: {
        value: true,
      },
    },
  },
  // created 10 days ago
  created_at: new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
  // started 3 days ago
  started_at: new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
  // completed after 100 seconds
  completed_at: new Date(now - 10 * 24 * 3600 * 1000 + 100 * 1000).toISOString(),
};

export const spoIncrementalSyncJob: ConnectorSyncJob = {
  id: '2',
  job_type: SyncJobType.INCREMENTAL,
  status: SyncStatus.ERROR,
  trigger_method: TriggerMethod.ON_DEMAND,
  error: 'spo_incremental_error',
  connector: {
    id: spoConnector.id,
    configuration: {
      use_text_extraction_service: {
        value: true,
      },
    },
  },
  // created 3 days ago
  created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
  // started 3 days ago
  started_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
  // completed after 100 seconds
  completed_at: new Date(now - 3 * 24 * 3600 * 1000 + 100 * 1000).toISOString(),
};

export const spoAccessControlSyncJob: ConnectorSyncJob = {
  id: '3',
  job_type: SyncJobType.ACCESS_CONTROL,
  status: SyncStatus.COMPLETED,
  trigger_method: TriggerMethod.ON_DEMAND,
  connector: {
    id: spoConnector.id,
    configuration: {
      use_text_extraction_service: {
        value: true,
      },
    },
  },
  // created 3 days ago
  created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
  // started 3 days ago
  started_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
  // completed after 20 seconds
  completed_at: new Date(now - 3 * 24 * 3600 * 1000 + 20 * 1000).toISOString(),
};

export const mysqlFullSyncJob: ConnectorSyncJob = {
  id: '4',
  job_type: SyncJobType.FULL,
  status: SyncStatus.COMPLETED,
  trigger_method: TriggerMethod.SCHEDULED,
  connector: {
    id: mysqlConnector.id,
    configuration: {
      use_text_extraction_service: {
        value: false,
      },
    },
  },
  // created 12 days ago
  created_at: new Date(now - 12 * 24 * 3600 * 1000).toISOString(),
  // started 12 days ago
  started_at: new Date(now - 12 * 24 * 3600 * 1000).toISOString(),
  // completed after 200 seconds
  completed_at: new Date(now - 12 * 24 * 3600 * 1000 + 200 * 1000).toISOString(),
};

export const orphanedSyncJob: ConnectorSyncJob = {
  id: '5',
  job_type: SyncJobType.FULL,
  status: SyncStatus.COMPLETED,
  trigger_method: TriggerMethod.ON_DEMAND,
  connector: {
    id: '3',
    service_type: 'github',
    configuration: {
      use_text_extraction_service: {
        value: false,
      },
    },
  },
  // created 12 days ago
  created_at: new Date(now - 12 * 24 * 3600 * 1000).toISOString(),
  // started 12 days ago
  started_at: new Date(now - 12 * 24 * 3600 * 1000).toISOString(),
  // completed after 200 seconds
  completed_at: new Date(now - 12 * 24 * 3600 * 1000 + 200 * 1000).toISOString(),
};

export const expectedSpoConnectorStats: ConnectorStats = {
  id: spoConnector.id,
  serviceType: spoConnector.service_type,
  isNative: spoConnector.is_native,
  isDeleted: false,
  status: spoConnector.status,
  indexName: spoConnector.index_name,
  dlsEnabled: true,
  sslEnabled: false,
  fetchSelectively: true,
  textExtractionServiceEnabled: true,
  documents: {
    total: 1000,
    volume: 10000,
    inLastSync: 1000,
  },
  dataSourceSpecific: {},
  scheduling: {
    accessControl: spoConnector.scheduling.access_control,
    full: spoConnector.scheduling.full,
    incremental: spoConnector.scheduling.incremental,
  },
  syncRules: {
    active: {
      withBasicRules: true,
      withAdvancedRules: false,
    },
    draft: {
      withBasicRules: false,
      withAdvancedRules: true,
    },
  },
  ingestPipeline: {
    name: spoConnector.pipeline.name,
    extractBinaryContent: spoConnector.pipeline.extract_binary_content,
    reduceWhitespace: spoConnector.pipeline.reduce_whitespace,
    runMLInference: spoConnector.pipeline.run_ml_inference,
  },
  syncJobs: {
    overall: {
      total: 3,
      last30Days: {
        overall: {
          total: 3,
          manual: 2,
          scheduled: 1,
          completed: 2,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 220,
          topErrors: ['spo_incremental_error'],
        },
        accessControl: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 20,
          topErrors: [],
        },
        full: {
          total: 1,
          manual: 0,
          scheduled: 1,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: [],
        },
        incremental: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 0,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: ['spo_incremental_error'],
        },
      },
      last7Days: {
        overall: {
          total: 2,
          manual: 2,
          scheduled: 0,
          completed: 1,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 120,
          topErrors: ['spo_incremental_error'],
        },
        accessControl: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 20,
          topErrors: [],
        },
        incremental: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 0,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: ['spo_incremental_error'],
        },
      },
    },
    withTextExtractionServiceEnabled: {
      total: 3,
      last30Days: {
        overall: {
          total: 3,
          manual: 2,
          scheduled: 1,
          completed: 2,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 220,
          topErrors: ['spo_incremental_error'],
        },
        accessControl: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 20,
          topErrors: [],
        },
        full: {
          total: 1,
          manual: 0,
          scheduled: 1,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: [],
        },
        incremental: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 0,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: ['spo_incremental_error'],
        },
      },
      last7Days: {
        overall: {
          total: 2,
          manual: 2,
          scheduled: 0,
          completed: 1,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 120,
          topErrors: ['spo_incremental_error'],
        },
        accessControl: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 20,
          topErrors: [],
        },
        incremental: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 0,
          errored: 1,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 100,
          topErrors: ['spo_incremental_error'],
        },
      },
    },
  },
};

export const expectedMysqlConnectorStats: ConnectorStats = {
  id: mysqlConnector.id,
  serviceType: mysqlConnector.service_type,
  isNative: mysqlConnector.is_native,
  isDeleted: false,
  status: mysqlConnector.status,
  indexName: mysqlConnector.index_name,
  dlsEnabled: false,
  sslEnabled: true,
  fetchSelectively: false,
  textExtractionServiceEnabled: false,
  documents: {
    total: 2000,
    volume: 20000,
    inLastSync: 2000,
  },
  dataSourceSpecific: {
    mysql: {
      tables: 7,
    },
  },
  scheduling: {
    accessControl: mysqlConnector.scheduling.access_control,
    full: mysqlConnector.scheduling.full,
    incremental: mysqlConnector.scheduling.incremental,
  },
  syncRules: {
    active: {
      withBasicRules: false,
      withAdvancedRules: false,
    },
    draft: {
      withBasicRules: false,
      withAdvancedRules: false,
    },
  },
  ingestPipeline: {
    name: mysqlConnector.pipeline.name,
    extractBinaryContent: mysqlConnector.pipeline.extract_binary_content,
    reduceWhitespace: mysqlConnector.pipeline.reduce_whitespace,
    runMLInference: mysqlConnector.pipeline.run_ml_inference,
  },
  syncJobs: {
    overall: {
      total: 1,
      last30Days: {
        overall: {
          total: 1,
          manual: 0,
          scheduled: 1,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 200,
          topErrors: [],
        },
        full: {
          total: 1,
          manual: 0,
          scheduled: 1,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 200,
          topErrors: [],
        },
      },
    },
  },
};

export const expectedDeletedConnectorStats: ConnectorStats = {
  id: orphanedSyncJob.connector.id,
  isDeleted: true,
  serviceType: 'github',
  syncJobs: {
    overall: {
      total: 1,
      last30Days: {
        overall: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 200,
          topErrors: [],
        },
        full: {
          total: 1,
          manual: 1,
          scheduled: 0,
          completed: 1,
          errored: 0,
          canceled: 0,
          suspended: 0,
          idle: 0,
          running: 0,
          totalDurationSeconds: 200,
          topErrors: [],
        },
      },
    },
  },
};
