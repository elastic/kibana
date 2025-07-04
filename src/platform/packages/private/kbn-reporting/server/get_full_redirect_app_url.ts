/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from 'url';

import { buildKibanaPath, REPORTING_REDIRECT_APP } from '@kbn/reporting-common';
import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '.';

export function getFullRedirectAppUrl(
  config: ReportingConfigType,
  serverInfo: ReportingServerInfo,
  spaceId?: string,
  forceNow?: string
) {
  const {
    kibanaServer: { protocol, hostname, port },
  } = config;
  const path = buildKibanaPath({
    basePath: serverInfo.basePath,
    spaceId,
    appPath: REPORTING_REDIRECT_APP,
  });

  return format({
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
    pathname: path,
    query: forceNow ? { forceNow } : undefined,
  });
}
