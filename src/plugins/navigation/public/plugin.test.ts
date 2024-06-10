/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { cloudExperimentsMock } from '@kbn/cloud-experiments-plugin/common/mocks';
import type { BuildFlavor } from '@kbn/config';
import type { UserSettingsData } from '@kbn/user-profile-components';
import { SOLUTION_NAV_FEATURE_FLAG_NAME } from '../common';
import { NavigationPublicPlugin } from './plugin';

jest.mock('rxjs', () => {
  const original = jest.requireActual('rxjs');
  return {
    ...original,
    debounceTime: () => (source: any) => source,
  };
});

const setup = (
  config: {
    featureOn: boolean;
  },
  {
    buildFlavor = 'traditional',
    userSettings = {},
  }: {
    buildFlavor?: BuildFlavor;
    userSettings?: UserSettingsData;
  } = {}
) => {
  const initializerContext = coreMock.createPluginInitializerContext({}, { buildFlavor });
  const plugin = new NavigationPublicPlugin(initializerContext);

  const setChromeStyle = jest.fn();
  const coreStart = coreMock.createStart();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const cloud = cloudMock.createStart();
  const cloudExperiments = cloudExperimentsMock.createStartMock();
  cloudExperiments.getVariation.mockImplementation((key) => {
    if (key === SOLUTION_NAV_FEATURE_FLAG_NAME) {
      return Promise.resolve(config.featureOn);
    }
    return Promise.resolve(false);
  });

  const getGlobalSetting$ = jest.fn();
  const settingsGlobalClient = {
    ...coreStart.settings.globalClient,
    get$: getGlobalSetting$,
  };
  coreStart.settings.globalClient = settingsGlobalClient;
  coreStart.chrome.setChromeStyle = setChromeStyle;

  return {
    plugin,
    coreStart,
    unifiedSearch,
    cloud,
    cloudExperiments,
    config,
    setChromeStyle,
  };
};

describe('Navigation Plugin', () => {
  describe('feature flag disabled', () => {
    const featureOn = false;

    it('should not add the default solutions nor set the active nav if the feature is disabled', () => {
      const { plugin, coreStart, unifiedSearch } = setup({ featureOn });
      plugin.start(coreStart, { unifiedSearch });
      expect(coreStart.chrome.project.updateSolutionNavigations).not.toHaveBeenCalled();
      expect(coreStart.chrome.project.changeActiveSolutionNavigation).not.toHaveBeenCalled();
    });

    it('should return flag to indicate that the solution navigation is disabled', async () => {
      const { plugin, coreStart, unifiedSearch } = setup({ featureOn });
      const isEnabled = await firstValueFrom(
        plugin.start(coreStart, { unifiedSearch }).isSolutionNavEnabled$
      );
      expect(isEnabled).toBe(false);
    });
  });

  describe('feature flag enabled', () => {
    const featureOn = true;

    // TODO: this test will have to be updated when we will read the space state
    it.skip('should add the default solution navs **and** set the active nav', async () => {
      const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup({ featureOn });

      plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
      await new Promise((resolve) => setTimeout(resolve));

      expect(coreStart.chrome.project.updateSolutionNavigations).toHaveBeenCalled();

      expect(coreStart.chrome.project.changeActiveSolutionNavigation).toHaveBeenCalledWith(
        'security'
      );
    });

    describe('set Chrome style', () => {
      it('should set the Chrome style to "classic" when the feature is not enabled', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: false } // feature not enabled
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');
      });

      it('should NOT set the Chrome style when the feature is enabled BUT on serverless', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: true }, // feature enabled
          { buildFlavor: 'serverless' }
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).not.toHaveBeenCalled();
      });

      // TODO: this test will have to be updated when we will read the space state
      it.skip('should set the Chrome style to "project" when the feature is enabled', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup({
          featureOn: true,
        });

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('project');
      });
    });

    describe('isSolutionNavEnabled$', () => {
      it('on serverless should flag must be disabled', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn },
          { buildFlavor: 'serverless' }
        );

        const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
          unifiedSearch,
          cloud,
          cloudExperiments,
        });
        await new Promise((resolve) => setTimeout(resolve));

        const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
        expect(isEnabled).toBe(false);
      });
    });
  });
});
