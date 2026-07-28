/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';

/** @internal */
export interface NavDependencyReporterDeps {
  /** Resolves an appId to the opaque id of the plugin that registered it. */
  getAppOwner: (appId: string) => PluginOpaqueId | undefined;
  /** Reverse lookup from a plugin's opaque id to its plugin id. */
  opaqueIdToPluginId: ReadonlyMap<PluginOpaqueId, PluginName>;
  logger: Logger;
}

/**
 * Reports (in log form) a cross-plugin navigation to an application whose owning
 * plugin is not declared as a dependency of the caller. This is the "report" mode
 * of the navigation-dependency cross-check: it never throws, and each undeclared
 * `caller -> owner` edge is logged at most once.
 *
 * @internal
 */
export type NavDependencyReporter = (
  callerPluginId: PluginName,
  callerDependencies: ReadonlySet<PluginName>,
  /** Either an appId (`"discover"`) or a deep-link id (`"management:transform"`). */
  target: string
) => void;

const NOOP_REPORTER: NavDependencyReporter = () => {};

/** @internal */
export const createNavDependencyReporter = ({
  getAppOwner,
  opaqueIdToPluginId,
  logger,
}: NavDependencyReporterDeps): NavDependencyReporter => {
  const alreadyReported = new Set<string>();

  return (callerPluginId, callerDependencies, target) => {
    // Deep-link ids take the shape `appId:deepLinkId`; only the app id owns a plugin.
    const appId = target.split(':')[0];
    if (!appId) {
      return;
    }

    const ownerOpaqueId = getAppOwner(appId);
    if (!ownerOpaqueId) {
      // App not registered (yet), or registered by Core rather than a plugin — nothing to attribute.
      return;
    }

    const ownerPluginId = opaqueIdToPluginId.get(ownerOpaqueId);
    if (!ownerPluginId || ownerPluginId === callerPluginId) {
      // Owner is not a plugin, or the caller is navigating within its own app.
      return;
    }

    if (callerDependencies.has(ownerPluginId)) {
      // Dependency is declared — this is exactly what we want.
      return;
    }

    const edge = `${callerPluginId} -> ${ownerPluginId} (${appId})`;
    if (alreadyReported.has(edge)) {
      return;
    }
    alreadyReported.add(edge);

    logger.warn(
      `Plugin "${callerPluginId}" navigates to application "${appId}" owned by plugin "${ownerPluginId}", ` +
        `but does not declare a dependency on it. Add "${ownerPluginId}" to "runtimePluginDependencies" ` +
        `(or "requiredPlugins"/"optionalPlugins") in the kibana.jsonc manifest of "${callerPluginId}" so this ` +
        `navigation dependency is explicit. See https://github.com/elastic/kibana/issues/66682`
    );
  };
};

/** @internal */
export const createNoopNavDependencyReporter = (): NavDependencyReporter => NOOP_REPORTER;
