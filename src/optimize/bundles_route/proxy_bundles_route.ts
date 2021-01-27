/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function createProxyBundlesRoute({
  host,
  port,
  buildHash,
}: {
  host: string;
  port: number;
  buildHash: string;
}) {
  return [buildProxyRouteForBundles(`/${buildHash}/bundles/`, host, port)];
}

function buildProxyRouteForBundles(routePath: string, host: string, port: number) {
  return {
    path: `${routePath}{path*}`,
    method: 'GET',
    handler: {
      proxy: {
        host,
        port,
        passThrough: true,
        xforward: true,
      },
    },
    config: { auth: false },
  };
}
