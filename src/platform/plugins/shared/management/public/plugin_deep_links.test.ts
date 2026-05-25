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
import type { AppUpdater, AppDeepLink } from '@kbn/core/public';

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
  it('defaults visibleIn to globalSearch and classicSideNav/solutionSideNav for apps without an explicit visibleIn', () => {
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
    expect(app?.visibleIn).toEqual(['globalSearch', 'classicSideNav', 'solutionSideNav']);
  });

  it('preserves explicit visibleIn when set to classicSideNav/solutionSideNav-only', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-both-nav-only',
      title: 'Test App both nav only',
      mount: jest.fn(),
      visibleIn: ['classicSideNav', 'solutionSideNav'],
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-both-nav-only');

    expect(app?.visibleIn).toEqual(['classicSideNav', 'solutionSideNav']);
  });

  it('preserves explicit visibleIn when set to globalSearch-only', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-global-only',
      title: 'Test App globalSearch only',
      mount: jest.fn(),
      visibleIn: ['globalSearch'],
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-global-only');

    expect(app?.visibleIn).toEqual(['globalSearch']);
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

  it('includes apps with hideFromGlobalSearch:true when explicit visibleIn is set', () => {
    const plugin = createPlugin();
    const setup = plugin.setup(coreMock.createSetup(), { share: mockShare });

    setup.sections.section.kibana.registerApp({
      id: 'test-hidden-with-visible-in',
      title: 'Hidden App With visibleIn',
      mount: jest.fn(),
      hideFromGlobalSearch: true,
      visibleIn: ['classicSideNav', 'solutionSideNav'],
    });

    const deepLinks = getDeepLinksFromUpdater(plugin);
    const kibana = deepLinks.find((s) => s.id === 'kibana');
    const app = kibana?.deepLinks?.find((a) => a.id === 'test-hidden-with-visible-in');

    expect(app).toBeDefined();
    expect(app?.visibleIn).toEqual(['classicSideNav', 'solutionSideNav']);
  });
});
