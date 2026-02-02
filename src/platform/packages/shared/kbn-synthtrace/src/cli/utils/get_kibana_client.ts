/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaClient } from '../../lib/shared/base_kibana_client';
import type { Logger } from '../../lib/utils/create_logger';
import { getApiKeyHeader, getBasicAuthHeader } from './get_auth_header';

export function getKibanaClient({
  target,
  username,
  password,
  apiKey,
  logger,
}: {
  target: string;
  username?: string;
  password?: string;
  apiKey?: string;
  logger: Logger;
}) {
  const kibanaClient = new KibanaClient({
    target,
    headers: {
      ...getBasicAuthHeader(username, password),
      ...getApiKeyHeader(apiKey),
    },
  });

  return kibanaClient;
}
