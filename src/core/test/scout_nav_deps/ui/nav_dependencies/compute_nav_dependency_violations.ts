/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shape of a single registered application, as exposed at runtime by the
 * `window.__kbnNavDependencies__()` bridge (dev/test only).
 */
export interface NavDependencyApp {
  appId: string;
  /** Plugin that registered the app, or `null` when it could not be resolved. */
  ownerPluginId: string | null;
  deepLinkIds: string[];
}

/**
 * Shape of a single solution navigation tree, as exposed at runtime by the
 * `window.__kbnNavDependencies__()` bridge (dev/test only).
 */
export interface NavDependencyTree {
  /** Plugin that registered the navigation tree. */
  ownerPluginId: string;
  /** Flattened list of `AppDeepLinkId` link targets referenced by the tree. */
  linkTargets: string[];
}

export interface NavDependenciesSnapshot {
  apps: NavDependencyApp[];
  navTrees: NavDependencyTree[];
}

/**
 * A cross-plugin navigation edge: a link from a plugin's navigation tree to an
 * application owned by another plugin.
 */
export interface NavDependencyEdge {
  /** Plugin that owns the navigation tree containing the link. */
  sourcePluginId: string;
  /** Plugin that owns the application the link points to. */
  targetPluginId: string;
  /** An example link target that produced this edge. */
  linkTarget: string;
  /** Whether the target plugin is declared in the source plugin's manifest. */
  declared: boolean;
}

/**
 * A cross-plugin navigation edge that is not declared in the source plugin's
 * `kibana.jsonc` manifest.
 */
export interface NavDependencyViolation {
  /** Plugin that owns the navigation tree containing the link. */
  sourcePluginId: string;
  /** Plugin that owns the application the link points to. */
  targetPluginId: string;
  /** An example link target that triggered the violation. */
  linkTarget: string;
}

/**
 * Resolves the owning `appId` of an `AppDeepLinkId`. Link targets are either a
 * bare `appId` or an `appId:deepLinkId` (possibly nested) form; the owner is
 * always determined by the leading `appId` segment.
 */
export const resolveAppId = (linkTarget: string): string => linkTarget.split(':')[0];

/**
 * Given a runtime navigation snapshot and a resolver for each plugin's declared
 * dependencies (the union of `requiredPlugins`, `optionalPlugins` and
 * `runtimePluginDependencies`), returns every cross-plugin navigation edge,
 * flagging whether each one is already declared in the source manifest.
 *
 * This is the full inventory of tracked links; it powers both the enforcement
 * check (undeclared edges) and the test's materialized artifact.
 *
 * The function is pure: manifest reading and browser interaction happen in the
 * caller, keeping this logic trivially unit-testable.
 */
export const collectNavDependencyEdges = (
  { apps, navTrees }: NavDependenciesSnapshot,
  getDeclaredDependencies: (pluginId: string) => readonly string[]
): NavDependencyEdge[] => {
  const ownerByAppId = new Map<string, string>();
  apps.forEach(({ appId, ownerPluginId }) => {
    if (ownerPluginId) {
      ownerByAppId.set(appId, ownerPluginId);
    }
  });

  const edges = new Map<string, NavDependencyEdge>();

  navTrees.forEach(({ ownerPluginId: sourcePluginId, linkTargets }) => {
    const declared = new Set(getDeclaredDependencies(sourcePluginId));

    linkTargets.forEach((linkTarget) => {
      const targetPluginId = ownerByAppId.get(resolveAppId(linkTarget));

      // Skip links we cannot attribute (e.g. app disabled in this deployment)
      // and links internal to the source plugin.
      if (!targetPluginId || targetPluginId === sourcePluginId) {
        return;
      }

      const key = `${sourcePluginId} -> ${targetPluginId}`;
      if (!edges.has(key)) {
        edges.set(key, {
          sourcePluginId,
          targetPluginId,
          linkTarget,
          declared: declared.has(targetPluginId),
        });
      }
    });
  });

  return [...edges.values()];
};

/**
 * Returns the cross-plugin navigation edges that are missing from the source
 * plugin's `kibana.jsonc` manifest, i.e. the enforcement violations.
 */
export const computeNavDependencyViolations = (
  snapshot: NavDependenciesSnapshot,
  getDeclaredDependencies: (pluginId: string) => readonly string[]
): NavDependencyViolation[] =>
  collectNavDependencyEdges(snapshot, getDeclaredDependencies)
    .filter(({ declared }) => !declared)
    .map(({ sourcePluginId, targetPluginId, linkTarget }) => ({
      sourcePluginId,
      targetPluginId,
      linkTarget,
    }));
