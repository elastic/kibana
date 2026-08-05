/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
import type { RegisteredAppInfo } from '@kbn/core-application-browser-internal';
import {
  NAV_DEPENDENCIES_GLOBAL,
  buildNavDependenciesSnapshot,
  exposeNavDependenciesSnapshot,
  type NavDependencyTreeInfo,
} from './nav_dependencies_snapshot';

const discoverId = Symbol('discover');
const dashboardId = Symbol('dashboard');
const coreId = Symbol('core');

const createApplication = (apps: RegisteredAppInfo[]) => ({
  getRegisteredAppsInfo: jest.fn(() => apps),
});

const opaqueIdToPluginId = new Map<PluginOpaqueId, PluginName>([
  [discoverId, 'discover'],
  [dashboardId, 'dashboard'],
]);

describe('buildNavDependenciesSnapshot', () => {
  it('resolves each app owner opaque id to its plugin id', () => {
    const application = createApplication([
      { appId: 'discover', owner: discoverId, deepLinkIds: [] },
      { appId: 'dashboards', owner: dashboardId, deepLinkIds: ['dashboards:list'] },
    ]);

    const snapshot = buildNavDependenciesSnapshot({ application, opaqueIdToPluginId });

    expect(snapshot.apps).toEqual([
      { appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] },
      { appId: 'dashboards', ownerPluginId: 'dashboard', deepLinkIds: ['dashboards:list'] },
    ]);
  });

  it('reports a null owner for Core-owned apps (opaque id not mapped to a plugin)', () => {
    const application = createApplication([{ appId: 'home', owner: coreId, deepLinkIds: [] }]);

    const snapshot = buildNavDependenciesSnapshot({ application, opaqueIdToPluginId });

    expect(snapshot.apps).toEqual([{ appId: 'home', ownerPluginId: null, deepLinkIds: [] }]);
  });

  it('includes nav trees provided by getNavTrees', () => {
    const application = createApplication([]);
    const navTrees: NavDependencyTreeInfo[] = [
      { ownerPluginId: 'enterpriseSearch', linkTargets: ['discover', 'management:transform'] },
    ];

    const snapshot = buildNavDependenciesSnapshot({
      application,
      opaqueIdToPluginId,
      getNavTrees: () => navTrees,
    });

    expect(snapshot.navTrees).toEqual(navTrees);
  });

  it('defaults nav trees to an empty array when no provider is given', () => {
    const application = createApplication([]);

    const snapshot = buildNavDependenciesSnapshot({ application, opaqueIdToPluginId });

    expect(snapshot.navTrees).toEqual([]);
  });
});

describe('exposeNavDependenciesSnapshot', () => {
  afterEach(() => {
    delete window[NAV_DEPENDENCIES_GLOBAL];
  });

  it('attaches a lazy accessor on window that returns the snapshot on demand', () => {
    const application = createApplication([
      { appId: 'discover', owner: discoverId, deepLinkIds: [] },
    ]);

    exposeNavDependenciesSnapshot({ application, opaqueIdToPluginId });

    // Not called until the accessor is invoked (inert until read).
    expect(application.getRegisteredAppsInfo).not.toHaveBeenCalled();

    const snapshot = window[NAV_DEPENDENCIES_GLOBAL]!();

    expect(application.getRegisteredAppsInfo).toHaveBeenCalledTimes(1);
    expect(snapshot.apps).toEqual([
      { appId: 'discover', ownerPluginId: 'discover', deepLinkIds: [] },
    ]);
  });
});
