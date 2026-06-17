/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import type { Logger } from '@kbn/logging';
import type { PluginWrapper } from './plugin';

/**
 * Validates cross-plugin DI services and extension points from the plugin
 * manifests, before any plugin is started.
 *
 * Services must have exactly one provider when consumed. Extension points must
 * have exactly one host when contributions exist. Zero contributions to a
 * hosted extension point are allowed. In `error` mode this throws, aborting
 * startup before `start()` runs.
 */
export const validateGlobalTokens = (
  plugins: ReadonlyMap<PluginName, PluginWrapper>,
  mode: 'warn' | 'error',
  log: Logger
): void => {
  const serviceProviders = new Map<string, string[]>();
  const extensionHosts = new Map<string, string[]>();

  for (const plugin of plugins.values()) {
    for (const token of plugin.manifest.globals.services.provides) {
      serviceProviders.set(token, [...(serviceProviders.get(token) ?? []), plugin.name]);
    }
    for (const token of plugin.manifest.globals.extensionPoints.hosts) {
      extensionHosts.set(token, [...(extensionHosts.get(token) ?? []), plugin.name]);
    }
  }

  const violations: string[] = [];

  for (const [pluginName, plugin] of plugins) {
    for (const token of plugin.manifest.globals.services.consumes) {
      const providers = serviceProviders.get(token) ?? [];
      if (providers.length === 0) {
        const expectedProvider = token.split('.')[0] ?? 'unknown';
        violations.push(
          `Plugin "${pluginName}" consumes service token "${token}" but no enabled plugin provides it. ` +
            `The "${expectedProvider}" plugin may be disabled or not installed.`
        );
      } else if (providers.length > 1) {
        violations.push(
          `Plugin "${pluginName}" consumes service token "${token}" but it has multiple providers: ${providers.join(
            ', '
          )}.`
        );
      }
    }

    for (const token of plugin.manifest.globals.extensionPoints.contributes) {
      const hosts = extensionHosts.get(token) ?? [];
      if (hosts.length === 0) {
        const expectedHost = token.split('.')[0] ?? 'unknown';
        violations.push(
          `Plugin "${pluginName}" contributes to extension point "${token}" but no enabled plugin hosts it. ` +
            `The "${expectedHost}" plugin may be disabled or not installed.`
        );
      } else if (hosts.length > 1) {
        violations.push(
          `Plugin "${pluginName}" contributes to extension point "${token}" but it has multiple hosts: ${hosts.join(
            ', '
          )}.`
        );
      }
    }
  }

  for (const [token, providers] of serviceProviders) {
    if (providers.length > 1) {
      violations.push(`Service token "${token}" has multiple providers: ${providers.join(', ')}.`);
    }
  }

  for (const [token, hosts] of extensionHosts) {
    if (hosts.length > 1) {
      violations.push(`Extension point "${token}" has multiple hosts: ${hosts.join(', ')}.`);
    }
  }

  if (violations.length === 0) {
    return;
  }

  for (const message of violations) {
    log.warn(message);
  }

  if (mode === 'error') {
    throw new Error(
      `Cross-plugin DI validation failed. ${violations.length} issue(s) found:\n${violations
        .map((message) => `  ${message}`)
        .join('\n')}`
    );
  }
};
