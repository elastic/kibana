/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';

const getUrlHost = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  try {
    const { hostname } = new URL(value.trim());
    return hostname.length > 0 ? hostname.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

/** Hosts a sandbox command may send a connector's auth headers to: fixed hosts plus configured URL hosts. */
export const getSandboxHosts = (
  sandbox: ConnectorSpec['sandbox'],
  config: Record<string, unknown>
): string[] => {
  if (!sandbox) {
    return [];
  }

  const { hosts = [], hostsFromConfig = [] } = sandbox;
  const configHosts = hostsFromConfig.flatMap((field) => {
    const host = getUrlHost(config[field]);
    return host ? [host] : [];
  });

  return [...new Set([...hosts.map((host) => host.toLowerCase()), ...configHosts])];
};
