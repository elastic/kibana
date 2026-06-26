/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';

/**
 * Validates cross-plugin DI services and extension points in the browser,
 * before any plugin is started.
 *
 * Logs warnings to the browser console; never throws.
 */
export const validateGlobalTokens = (plugins: readonly InjectedMetadataPlugin[]): void => {
  const serviceProviders = new Map<string, string[]>();
  const extensionHosts = new Map<string, string[]>();

  for (const { plugin } of plugins) {
    for (const token of plugin.globals.services.provides) {
      serviceProviders.set(token, [...(serviceProviders.get(token) ?? []), plugin.id]);
    }
    for (const token of plugin.globals.extensionPoints.hosts) {
      extensionHosts.set(token, [...(extensionHosts.get(token) ?? []), plugin.id]);
    }
  }

  for (const { id, plugin } of plugins) {
    for (const token of plugin.globals.services.consumes) {
      const providers = serviceProviders.get(token) ?? [];
      if (providers.length === 0) {
        const expectedProvider = token.split('.')[0] ?? 'unknown';
        // eslint-disable-next-line no-console
        console.warn(
          `[DI] Plugin "${id}" consumes service token "${token}" but no enabled plugin provides it. ` +
            `The "${expectedProvider}" plugin may be disabled or not loaded.`
        );
      } else if (providers.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(
          `[DI] Plugin "${id}" consumes service token "${token}" but it has multiple providers: ${providers.join(
            ', '
          )}.`
        );
      }
    }

    for (const token of plugin.globals.extensionPoints.contributes) {
      const hosts = extensionHosts.get(token) ?? [];
      if (hosts.length === 0) {
        const expectedHost = token.split('.')[0] ?? 'unknown';
        // eslint-disable-next-line no-console
        console.warn(
          `[DI] Plugin "${id}" contributes to extension point "${token}" but no enabled plugin hosts it. ` +
            `The "${expectedHost}" plugin may be disabled or not loaded.`
        );
      } else if (hosts.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(
          `[DI] Plugin "${id}" contributes to extension point "${token}" but it has multiple hosts: ${hosts.join(
            ', '
          )}.`
        );
      }
    }
  }

  for (const [token, providers] of serviceProviders) {
    if (providers.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DI] Service token "${token}" has multiple providers: ${providers.join(', ')}.`
      );
    }
  }

  for (const [token, hosts] of extensionHosts) {
    if (hosts.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(`[DI] Extension point "${token}" has multiple hosts: ${hosts.join(', ')}.`);
    }
  }
};
