/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

export interface ElasticsearchAPMSettings {
  apmSecretToken: string;
  apmServerUrl: string;
}

export function getApmSettings(
  log: ToolingLog,
  apmServerUrl?: string,
  apmSecretToken?: string
): ElasticsearchAPMSettings | undefined {
  if (apmServerUrl && apmSecretToken) {
    log.info(`Elasticsearch APM is enabled. Reporting to ${apmServerUrl}`);
    return {
      apmSecretToken,
      apmServerUrl,
    };
  } else {
    log.info('Elasticsearch APM is disabled');
  }
}
