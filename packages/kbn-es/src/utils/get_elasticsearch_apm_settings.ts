/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { ElasticsearchAPMSettings } from './types';

export function getElasticsearchApmSettings(log: ToolingLog): ElasticsearchAPMSettings {
  const enabled = process.env.ELASTIC_APM_ACTIVE === 'true';
  const config: ElasticsearchAPMSettings = {
    enabled,
    apmSecretToken: process.env.ELASTIC_APM_SECRET_TOKEN || '',
    apmServerUrl: process.env.ELASTIC_APM_SERVER_URL || '',
    samplingRate: parseInt(process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE || '0', 10),
    logLevel: 'debug',
  };

  if (enabled) {
    log.info(`Elasticsearch APM is enabled. Reporting to ${config.apmServerUrl}`);
  } else {
    log.info(`Elasticsearch APM is disabled.`);
  }
  return config;
}
