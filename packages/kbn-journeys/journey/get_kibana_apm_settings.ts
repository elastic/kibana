/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getAPMSettings() {
  // These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
  const DEFAULT_APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
  const DEFAULT_APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';

  console.log('-----------------------');
  console.log(process.env);

  const {
    ELASTIC_APM_ACTIVE = 'true',
    ELASTIC_APM_CONTEXT_PROPAGATION_ONLY = 'false',
    ELASTIC_APM_TRANSACTION_SAMPLE_RATE = '1.0',
    ELASTIC_APM_SERVER_URL = DEFAULT_APM_SERVER_URL,
    ELASTIC_APM_SECRET_TOKEN = DEFAULT_APM_PUBLIC_TOKEN,
    ELASTIC_APM_ENVIRONMENT = process.env.CI ? 'ci' : 'development',
    // capture request body for both errors and request transactions
    // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-body
    ELASTIC_APM_CAPTURE_BODY = 'all',
    // capture request headers
    // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-headers
    ELASTIC_APM_CAPTURE_HEADERS = true,
    // request body with bigger size will be trimmed.
    // 300_000 is the default of the APM server.
    // for a body with larger size, we might need to reconfigure the APM server to increase the limit.
    // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#long-field-max-length
    ELASTIC_APM_LONG_FIELD_MAX_LENGTH = 300_000,
  } = process.env;
  return {
    ELASTIC_APM_ACTIVE,
    ELASTIC_APM_CONTEXT_PROPAGATION_ONLY,
    ELASTIC_APM_ENVIRONMENT,
    ELASTIC_APM_TRANSACTION_SAMPLE_RATE,
    ELASTIC_APM_SERVER_URL,
    ELASTIC_APM_SECRET_TOKEN,
    ELASTIC_APM_CAPTURE_BODY,
    ELASTIC_APM_CAPTURE_HEADERS,
    ELASTIC_APM_LONG_FIELD_MAX_LENGTH,
  };
}
