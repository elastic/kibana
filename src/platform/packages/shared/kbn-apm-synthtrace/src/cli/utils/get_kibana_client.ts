/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaClient } from '../../lib/shared/base_kibana_client';
import { Logger } from '../../lib/utils/create_logger';

export function getKibanaClient({
  target,
  username,
  password,
  logger,
}: {
  target: string;
  username?: string;
  password?: string;
  logger: Logger;
}) {
  const url = new URL(target);
  if (username && password) {
    url.username = username;
    url.password = password;
  }

  const kibanaClient = new KibanaClient({
    target: url.toString(),
  });

  return kibanaClient;
}
