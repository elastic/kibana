/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';

/**
 * Ownership metadata for a single registered application.
 * @internal
 */
export interface NavDependencyAppInfo {
  appId: string;
  /** Id of the plugin that registered the app, or `null` for Core-owned apps. */
  ownerPluginId: string | null;
  /** Ids of the app's deep links that resolve to a path. */
  deepLinkIds: string[];
}

/**
 * A solution navigation tree together with the plugin that registered it and the app/deep-link
 * targets it references. Populated once solution nav-tree attribution is in place.
 * @internal
 */
export interface NavDependencyTreeInfo {
  ownerPluginId: string;
  /** `link` targets, each an appId (`"discover"`) or deep-link id (`"management:transform"`). */
  linkTargets: string[];
}

/**
 * Inert snapshot of the browser-side data needed to reconstruct cross-plugin navigation edges.
 * Exposed on `window` only when the internal `plugins.exposeNavDependencies` config is enabled
 * (off by default) and consumed by the navigation-dependency enforcement test. It never enforces
 * anything by itself.
 *
 * @internal
 */
export interface NavDependenciesSnapshot {
  apps: NavDependencyAppInfo[];
  navTrees: NavDependencyTreeInfo[];
}

/** Name of the `window` global exposing {@link NavDependenciesSnapshot} when enabled. */
export const NAV_DEPENDENCIES_GLOBAL = '__kbnNavDependencies__' as const;

declare global {
  interface Window {
    /**
     * Dev/test-only accessor returning the cross-plugin navigation dependency snapshot.
     * Present only when the internal `plugins.exposeNavDependencies` config is enabled; consumed by
     * the navigation-dependency enforcement test (see https://github.com/elastic/kibana/issues/66682).
     * @internal
     */
    __kbnNavDependencies__?: () => NavDependenciesSnapshot;
  }
}

/** @internal */
export interface NavDependenciesSnapshotDeps {
  application: Pick<InternalApplicationStart, 'getRegisteredAppsInfo'>;
  opaqueIdToPluginId: ReadonlyMap<PluginOpaqueId, PluginName>;
  /** Provider for the registered solution nav trees. Absent until nav-tree attribution lands. */
  getNavTrees?: () => NavDependencyTreeInfo[];
}

/**
 * Builds the (inert) navigation-dependency snapshot from the current application registry and the
 * opaque-id -> plugin-id reverse map. Kept pure so it can be unit tested without touching `window`.
 *
 * @internal
 */
export const buildNavDependenciesSnapshot = ({
  application,
  opaqueIdToPluginId,
  getNavTrees,
}: NavDependenciesSnapshotDeps): NavDependenciesSnapshot => ({
  apps: application.getRegisteredAppsInfo().map(({ appId, owner, deepLinkIds }) => ({
    appId,
    ownerPluginId: opaqueIdToPluginId.get(owner) ?? null,
    deepLinkIds,
  })),
  navTrees: getNavTrees?.() ?? [],
});

/**
 * Attaches the dev/test-only navigation-dependency accessor to `window`. No-op outside a browser
 * environment. Callers are responsible for gating this behind the internal
 * `plugins.exposeNavDependencies` config (off by default).
 *
 * @internal
 */
export const exposeNavDependenciesSnapshot = (deps: NavDependenciesSnapshotDeps): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window[NAV_DEPENDENCIES_GLOBAL] = () => buildNavDependenciesSnapshot(deps);
};
