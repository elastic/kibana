/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collectNavDependencyEdges,
  computeNavDependencyViolations,
  resolveAppId,
  type NavDependenciesSnapshot,
} from './compute_nav_dependency_violations';

const noDeclaredDependencies = () => [] as string[];

describe('resolveAppId', () => {
  it('returns the app id unchanged for a bare app link', () => {
    expect(resolveAppId('discover')).toBe('discover');
  });

  it('returns the leading app id segment for a deep-link target', () => {
    expect(resolveAppId('management:dataViews')).toBe('management');
    expect(resolveAppId('observability-overview:alerts:detail')).toBe('observability-overview');
  });
});

describe('computeNavDependencyViolations', () => {
  it('flags a cross-plugin link that is not declared in the source manifest', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] }],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['discover'] }],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([
      { sourcePluginId: 'serverlessSearch', targetPluginId: 'discover', linkTarget: 'discover' },
    ]);
  });

  it('does not flag a cross-plugin link that is already declared', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] }],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['discover'] }],
    };

    const declaredBy = (pluginId: string) => (pluginId === 'serverlessSearch' ? ['discover'] : []);

    expect(computeNavDependencyViolations(snapshot, declaredBy)).toEqual([]);
  });

  it('ignores links internal to the source plugin', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'enterpriseSearchApp', ownerPluginId: 'enterpriseSearch', deepLinkIds: [] }],
      navTrees: [{ ownerPluginId: 'enterpriseSearch', linkTargets: ['enterpriseSearchApp'] }],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([]);
  });

  it('ignores link targets that cannot be attributed to an owner', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'discover', ownerPluginId: null, deepLinkIds: [] }],
      navTrees: [
        { ownerPluginId: 'serverlessSearch', linkTargets: ['discover', 'someUnknownApp'] },
      ],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([]);
  });

  it('resolves deep-link targets to the owning app', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'management', ownerPluginId: 'management', deepLinkIds: ['dataViews'] }],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['management:dataViews'] }],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([
      {
        sourcePluginId: 'serverlessSearch',
        targetPluginId: 'management',
        linkTarget: 'management:dataViews',
      },
    ]);
  });

  it('deduplicates multiple links between the same plugin pair', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [
        { appId: 'management', ownerPluginId: 'management', deepLinkIds: ['dataViews', 'roles'] },
      ],
      navTrees: [
        {
          ownerPluginId: 'serverlessSearch',
          linkTargets: ['management:dataViews', 'management:roles'],
        },
      ],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([
      {
        sourcePluginId: 'serverlessSearch',
        targetPluginId: 'management',
        linkTarget: 'management:dataViews',
      },
    ]);
  });

  it('reports one violation per distinct target plugin', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [
        { appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] },
        { appId: 'dashboards', ownerPluginId: 'dashboard', deepLinkIds: [] },
      ],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['discover', 'dashboards'] }],
    };

    expect(computeNavDependencyViolations(snapshot, noDeclaredDependencies)).toEqual([
      { sourcePluginId: 'serverlessSearch', targetPluginId: 'discover', linkTarget: 'discover' },
      { sourcePluginId: 'serverlessSearch', targetPluginId: 'dashboard', linkTarget: 'dashboards' },
    ]);
  });
});

describe('collectNavDependencyEdges', () => {
  it('returns every cross-plugin edge and flags whether it is declared', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [
        { appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] },
        { appId: 'dashboards', ownerPluginId: 'dashboard', deepLinkIds: [] },
      ],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['discover', 'dashboards'] }],
    };

    const declaredBy = (pluginId: string) => (pluginId === 'serverlessSearch' ? ['discover'] : []);

    expect(collectNavDependencyEdges(snapshot, declaredBy)).toEqual([
      {
        sourcePluginId: 'serverlessSearch',
        targetPluginId: 'discover',
        linkTarget: 'discover',
        declared: true,
      },
      {
        sourcePluginId: 'serverlessSearch',
        targetPluginId: 'dashboard',
        linkTarget: 'dashboards',
        declared: false,
      },
    ]);
  });

  it('excludes internal and unattributable links, matching the enforcement scope', () => {
    const snapshot: NavDependenciesSnapshot = {
      apps: [{ appId: 'ownApp', ownerPluginId: 'serverlessSearch', deepLinkIds: [] }],
      navTrees: [{ ownerPluginId: 'serverlessSearch', linkTargets: ['ownApp', 'someUnknownApp'] }],
    };

    expect(collectNavDependencyEdges(snapshot, noDeclaredDependencies)).toEqual([]);
  });
});
