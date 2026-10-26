/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext, HostTarget } from './client_type_spec';

/**
 * Native (non-HTTP) client types cannot be tunnelled through the HTTP(S) CONNECT proxy that
 * `xpack.actions.proxyUrl` configures for the Axios connector path. Rather than silently connecting
 * without the platform's configured egress proxy (a silent policy downgrade), fail loudly with
 * `message` when any target would have been proxied. Hosts in `proxyBypassHosts`, and hosts outside
 * `proxyOnlyHosts` when it is set, are not proxied and may connect directly.
 */
export const ensureNoProxyRequired = (
  ctx: BuildContext,
  targets: HostTarget[],
  message: string
): void => {
  const proxySettings = ctx.networkSettings.getProxySettings();
  if (!proxySettings) return;

  const isProxied = targets.some(({ hostname }) => {
    if (proxySettings.proxyBypassHosts?.has(hostname)) return false;
    if (proxySettings.proxyOnlyHosts && !proxySettings.proxyOnlyHosts.has(hostname)) return false;
    return true;
  });
  if (isProxied) {
    throw new Error(message);
  }
};
