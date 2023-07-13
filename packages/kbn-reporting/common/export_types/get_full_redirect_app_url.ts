/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format } from 'url';
import { getRedirectAppPath } from '../constants';
import { buildKibanaPath } from './build_kibana_path';
import { ReportingConfigType } from './reporting_config_type';
import { ReportingServerInfo } from './types';

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
    appPath: getRedirectAppPath(),
  });

  return format({
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
    pathname: path,
    query: forceNow ? { forceNow } : undefined,
  });
}
