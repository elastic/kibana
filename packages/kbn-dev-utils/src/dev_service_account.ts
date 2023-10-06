/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const env = process.env;

/**
 * `kibana-dev` service account token for connecting to ESS
 * See packages/kbn-es/src/serverless_resources/README.md
 */
export const kibanaDevServiceAccount = {
  token:
    env.TEST_KIBANA_SERVICE_ACCOUNT_TOKEN ||
    'AAEAAWVsYXN0aWMva2liYW5hL2tpYmFuYS1kZXY6VVVVVVVVTEstKiBaNA',
};

export const fleetServerDevServiceAccount = {
  token:
    env.TEST_FLEET_SERVER_SERVICE_ACCOUNT_TOKEN ||
    'AAEAAWVsYXN0aWMvZmxlZXQtc2VydmVyL2ZsZWV0LXNlcnZlci1kZXY6VVo1TWd6MnFTX3FVTWliWGNXNzlwQQ',
};
