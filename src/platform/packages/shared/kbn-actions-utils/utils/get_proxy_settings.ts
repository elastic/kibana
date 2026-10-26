/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProxySettings } from './types';

interface GetProxySettingsOpts {
  url?: string;
  hasAuth?: boolean;
  username?: string;
  password?: string;
  verificationMode?: 'none' | 'certificate' | 'full';
  bypassHosts?: string[];
  onlyHosts?: string[];
  headers?: Record<string, string>;
}

export function getProxySettings(opts: GetProxySettingsOpts): ProxySettings | undefined {
  const { url, hasAuth, username, password, verificationMode, bypassHosts, onlyHosts, headers } =
    opts;

  if (!url) {
    return undefined;
  }

  const parsedUrl = new URL(url);
  if (hasAuth && username && password) {
    parsedUrl.username = username;
    parsedUrl.password = password;
  }

  return {
    proxyUrl: parsedUrl.toString(),
    proxyBypassHosts: bypassHosts ? new Set(bypassHosts) : undefined,
    proxyOnlyHosts: onlyHosts ? new Set(onlyHosts) : undefined,
    proxySSLSettings: { verificationMode: verificationMode ?? 'full' },
    proxyHeaders: headers,
  };
}
