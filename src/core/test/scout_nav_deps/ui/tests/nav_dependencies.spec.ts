/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import {
  collectNavDependencyEdges,
  computeNavDependencyViolations,
  type NavDependenciesSnapshot,
} from '../nav_dependencies/compute_nav_dependency_violations';

declare global {
  interface Window {
    /**
     * Test-only bridge exposed by `@kbn/core-plugins-browser-internal`, gated
     * behind the internal `plugins.exposeNavDependencies` config that the
     * `nav_deps` Scout config set enables.
     */
    __kbnNavDependencies__?: () => NavDependenciesSnapshot;
  }
}

/**
 * Every deployment that has a `nav_deps` server config, so that each solution's
 * navigation tree is harvested at least once. Stateful only has a real server
 * config for `classic`; the serverless project types cover the solution trees
 * registered via `serverless.initNavigation`.
 */
const NAV_DEPS_DEPLOYMENTS = [
  ...tags.stateful.classic,
  ...tags.serverless.search,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
  ...tags.serverless.workplaceai,
  ...tags.serverless.vectordb,
];

/**
 * Builds a resolver returning the plugins each plugin declares as dependencies
 * (`requiredPlugins` ∪ `optionalPlugins` ∪ `runtimePluginDependencies`), read
 * straight from the `kibana.jsonc` manifests in the repo.
 */
const buildDeclaredDependencyResolver = (): ((pluginId: string) => readonly string[]) => {
  const declaredByPlugin = new Map<string, Set<string>>();

  getPackages(REPO_ROOT)
    .filter(getPluginPackagesFilter())
    .forEach(({ manifest }) => {
      if (manifest.type !== 'plugin') {
        return;
      }
      const {
        id,
        requiredPlugins = [],
        optionalPlugins = [],
        runtimePluginDependencies = [],
      } = manifest.plugin;

      declaredByPlugin.set(
        id,
        new Set([...requiredPlugins, ...optionalPlugins, ...runtimePluginDependencies])
      );
    });

  return (pluginId) => [...(declaredByPlugin.get(pluginId) ?? [])];
};

test.describe('cross-plugin navigation dependencies', { tag: NAV_DEPS_DEPLOYMENTS }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    // Navigating to the root boots the Kibana SPA (and therefore every browser
    // plugin), which is what populates the nav-dependency snapshot. `kbnUrl.get`
    // resolves the deployment's absolute Kibana URL (Scout does not configure a
    // Playwright `baseURL`, so a bare relative path is not navigable).
    await page.goto(kbnUrl.get('/'));
    await page.waitForFunction(() => typeof window.__kbnNavDependencies__ === 'function');
  });

  test('are declared in the owning plugin kibana.jsonc manifest', async ({ page }, testInfo) => {
    const snapshot = await page.evaluate(() => window.__kbnNavDependencies__!());

    const getDeclaredDependencies = buildDeclaredDependencyResolver();
    const edges = collectNavDependencyEdges(snapshot, getDeclaredDependencies);

    // Materialize the full inventory of tracked cross-plugin navigation links so
    // the harvested graph is visible in the Playwright report / CI artifacts,
    // regardless of whether the test passes or fails.
    await testInfo.attach('nav-dependencies.json', {
      contentType: 'application/json',
      body: JSON.stringify({ snapshot, edges }, null, 2),
    });

    const violations = computeNavDependencyViolations(snapshot, getDeclaredDependencies);

    const summary = violations
      .map(
        ({ sourcePluginId, targetPluginId, linkTarget }) =>
          `  - "${sourcePluginId}" links to "${targetPluginId}" (via "${linkTarget}") ` +
          `but does not declare it in requiredPlugins/optionalPlugins/runtimePluginDependencies`
      )
      .join('\n');

    expect(
      violations,
      `Found ${violations.length} undeclared cross-plugin navigation dependency(ies).\n` +
        `Add the missing plugin id to the source plugin's runtimePluginDependencies:\n${summary}`
    ).toEqual([]);
  });
});
