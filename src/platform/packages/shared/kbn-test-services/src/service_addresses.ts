/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getUrlParts } from './get_url_parts';

const parsedKbnUrlParts = process.env.TEST_KIBANA_URL
  ? getUrlParts(process.env.TEST_KIBANA_URL)
  : undefined;

const parsedEsUrlParts = process.env.TEST_ES_URL ? getUrlParts(process.env.TEST_ES_URL) : undefined;

export const TEST_KIBANA_HOST =
  parsedKbnUrlParts?.hostname || process.env.TEST_KIBANA_HOST || 'localhost';

export const TEST_KIBANA_PORT = Number(
  parsedKbnUrlParts?.port || process.env.TEST_KIBANA_PORT || 5620
);

export const TEST_REMOTE_KIBANA_PORT = Number(
  process.env.TEST_REMOTE_KIBANA_PORT || TEST_KIBANA_PORT + 1
);

export const TEST_ES_HOST = parsedEsUrlParts?.hostname || process.env.TEST_ES_HOST || 'localhost';
export const TEST_ES_PORT = Number(parsedEsUrlParts?.port || process.env.TEST_ES_PORT || 9220);

export const TEST_ES_TRANSPORT_PORT = Number(process.env.TEST_ES_TRANSPORT_PORT || 9300);

export const TEST_ES_02_PORT = TEST_ES_PORT + 2;
export const TEST_ES_02_TRANSPORT_PORT = TEST_ES_02_PORT + 100;

export const TEST_ES_03_PORT = TEST_ES_PORT + 3;
export const TEST_ES_03_TRANSPORT_PORT = TEST_ES_03_PORT + 100;

export const TEST_FLEET_HOST = 'localhost';
export const TEST_FLEET_PORT = Number(process.env.TEST_FLEET_PORT ?? 8220);

export const TEST_AGENTLESS_HOST = 'localhost';
export const TEST_AGENTLESS_PORT = Number(process.env.TEST_AGENTLESS_PORT ?? 8089);

export const FLEET_PACKAGE_REGISTRY_PORT = process.env.FLEET_PACKAGE_REGISTRY_PORT
  ? Number(process.env.FLEET_PACKAGE_REGISTRY_PORT)
  : undefined;

export const SERVICE_NAMESPACE = 'default';

export const ELASTIC_DOCKER_NETWORK_NAME = `elastic-${SERVICE_NAMESPACE}`;
