

import { ToolingLog } from '@kbn/tooling-log';
import { ElasticsearchAPMSettings } from './types';

export function getElasticsearchApmSettings(
    log: ToolingLog,
  ): ElasticsearchAPMSettings {
    const enabled = process.env.ELASTIC_APM_ACTIVE === 'true';
    const config: ElasticsearchAPMSettings = {
      enabled,
      apmSecretToken: process.env.ELASTIC_APM_SECRET_TOKEN || '',
      apmServerUrl: process.env.ELASTIC_APM_SERVER_URL || '',
      samplingRate: parseInt(process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE || '0'),
      logLevel: 'debug'
    };
  
    if (enabled) {
      log.info(`Elasticsearch APM is enabled. Reporting to ${config.apmServerUrl}`);
    } else {
      log.info(`Elasticsearch APM is disabled.`);
    }
    return config;
  }
  