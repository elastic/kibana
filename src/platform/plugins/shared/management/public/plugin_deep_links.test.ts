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
});
