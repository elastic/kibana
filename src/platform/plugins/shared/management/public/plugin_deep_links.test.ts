/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ManagementPlugin } from './plugin';
import { BehaviorSubject, Subject } from 'rxjs';
import type { AppUpdater, AppDeepLink, AppDeepLinkLocations } from '@kbn/core/public';

const mockShare = {
  url: {
    locators: {
      create: jest.fn().mockReturnValue({ id: 'mock-locator' }),
    },
  },
} as any;

function createPlugin() {
  const context = coreMock.createPluginInitializerContext();
  return new ManagementPlugin(context);
}

function getDeepLinksFromUpdater(plugin: ManagementPlugin): AppDeepLink[] {
  const updaterFn: AppUpdater = (plugin as any).appUpdater.getValue();
  const result = updaterFn({} as any);
  return (result?.deepLinks as AppDeepLink[]) ?? [];
}

describe('ManagementPlugin appUpdater deep link visibleIn', () => {
  it('defaults to globalSearch + projectSideNav (no classicSideNav, to avoid duplicating Stack Management entries in the classic hamburger)', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-no-visible-in',
      title: 'Test App No visibleIn',
      mount: jest.fn(),
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-no-visible-in');

    expect(app).toBeDefined();
    expect(app?.visibleIn).toEqual(['globalSearch', 'projectSideNav']);
  });

  it('excludes apps with hideFromGlobalSearch:true and no explicit visibleIn', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-hidden',
      title: 'Hidden App',
      mount: jest.fn(),
      hideFromGlobalSearch: true,
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-hidden');

    expect(app).toBeUndefined();
  });

  it('keeps apps with explicit visibleIn even when hideFromGlobalSearch is true', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-project-nav-only',
      title: 'Project Nav Only',
      mount: jest.fn(),
      hideFromGlobalSearch: true,
      visibleIn: ['projectSideNav'],
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-project-nav-only');

    expect(app).toBeDefined();
    expect(app?.visibleIn).toEqual(['projectSideNav']);
  });

  describe('visibleIn$', () => {
    let plugin: ManagementPlugin;
    let setup: ReturnType<ManagementPlugin['setup']>;

    const getApp = (id: string) =>
      getDeepLinksFromUpdater(plugin)
        .find((s) => s.id === 'kibana')
        ?.deepLinks?.find((a) => a.id === id);

    const start = () => plugin.start(coreMock.createStart(), { share: mockShare });

    beforeEach(() => {
      plugin = createPlugin();
      setup = plugin.setup(coreMock.createSetup(), { share: mockShare });
    });

    afterEach(() => {
      plugin.stop();
    });

    it('rebuilds deep links when an app emits a new visibleIn after start', () => {
      const visibleIn$ = new BehaviorSubject<AppDeepLinkLocations[]>(['projectSideNav']);
      setup.sections.section.kibana.registerApp({
        id: 'test-runtime',
        title: 'Runtime visibleIn',
        mount: jest.fn(),
        visibleIn$,
      });

      expect(getApp('test-runtime')?.visibleIn).toEqual(['globalSearch', 'projectSideNav']);

      start();
      expect(getApp('test-runtime')?.visibleIn).toEqual(['projectSideNav']);

      visibleIn$.next(['globalSearch', 'projectSideNav']);
      expect(getApp('test-runtime')?.visibleIn).toEqual(['globalSearch', 'projectSideNav']);
    });

    it('falls back to the registered visibleIn when the source errors, without stopping other apps', () => {
      const failing$ = new Subject<AppDeepLinkLocations[]>();
      const healthy$ = new BehaviorSubject<AppDeepLinkLocations[]>(['projectSideNav']);
      setup.sections.section.kibana.registerApp({
        id: 'test-failing',
        title: 'Failing',
        mount: jest.fn(),
        visibleIn: ['globalSearch'],
        visibleIn$: failing$,
      });
      setup.sections.section.kibana.registerApp({
        id: 'test-healthy',
        title: 'Healthy',
        mount: jest.fn(),
        visibleIn$: healthy$,
      });

      start();
      failing$.next(['projectSideNav']);
      expect(getApp('test-failing')?.visibleIn).toEqual(['projectSideNav']);

      failing$.error(new Error('boom'));
      expect(getApp('test-failing')?.visibleIn).toEqual(['globalSearch']);
      expect(getApp('test-healthy')?.visibleIn).toEqual(['projectSideNav']);

      healthy$.next(['globalSearch', 'projectSideNav']);
      expect(getApp('test-healthy')?.visibleIn).toEqual(['globalSearch', 'projectSideNav']);
    });

    it('treats an empty visibleIn$ emission as hidden everywhere, not as a fallback', () => {
      setup.sections.section.kibana.registerApp({
        id: 'test-empty',
        title: 'Empty',
        mount: jest.fn(),
        visibleIn: ['globalSearch'],
        visibleIn$: new BehaviorSubject<AppDeepLinkLocations[]>([]),
      });

      start();
      expect(getApp('test-empty')?.visibleIn).toEqual([]);
    });

    it('keeps an app hidden by hideFromGlobalSearch once visibleIn$ emits', () => {
      setup.sections.section.kibana.registerApp({
        id: 'test-hidden-runtime',
        title: 'Hidden runtime',
        mount: jest.fn(),
        hideFromGlobalSearch: true,
        visibleIn$: new BehaviorSubject<AppDeepLinkLocations[]>(['projectSideNav']),
      });

      expect(getApp('test-hidden-runtime')).toBeUndefined();

      start();
      expect(getApp('test-hidden-runtime')?.visibleIn).toEqual(['projectSideNav']);
    });

    it('ignores visibleIn$ on apps registered after start', () => {
      setup.sections.section.kibana.registerApp({
        id: 'test-setup-time',
        title: 'Setup time',
        mount: jest.fn(),
      });
      start();
      setup.sections.section.kibana.registerApp({
        id: 'test-late',
        title: 'Late',
        mount: jest.fn(),
        visibleIn$: new BehaviorSubject<AppDeepLinkLocations[]>(['projectSideNav']),
      });

      expect(getApp('test-late')?.visibleIn).toEqual(['globalSearch', 'projectSideNav']);
    });
  });
});
