/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Log } from '../log';
import type { CliDevConfig } from '../config';
import type { BasePathProxyServer } from './types';
import { Http1BasePathProxyServer } from './http1';
import { Http2BasePathProxyServer } from './http2';

export type { BasePathProxyServer, BasePathProxyServerOptions } from './types';
export { Http1BasePathProxyServer } from './http1';
export { Http2BasePathProxyServer } from './http2';

export const getBasePathProxyServer = ({
  log,
  httpConfig,
  devConfig,
}: {
  log: Log;
  httpConfig: CliDevConfig['http'];
  devConfig: CliDevConfig['dev'];
}): BasePathProxyServer => {
  if (httpConfig.protocol === 'http2') {
    return new Http2BasePathProxyServer(log, httpConfig, devConfig);
  } else {
    return new Http1BasePathProxyServer(log, httpConfig, devConfig);
  }
};
