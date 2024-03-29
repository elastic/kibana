/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { of } from 'rxjs';
import {
  DEFAULT_SOLUTION_NAV_UI_SETTING_ID,
  ENABLE_SOLUTION_NAV_UI_SETTING_ID,
  OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID,
} from '../common';
import { NavigationPublicPlugin } from './plugin';
import { ConfigSchema } from './types';
import type { BuildFlavor } from '@kbn/config';

const defaultConfig: ConfigSchema['solutionNavigation'] = {
  featureOn: true,
  enabled: true,
  optInStatus: 'visible',
  defaultSolution: 'es',
};

const setup = (
  partialConfig: Partial<ConfigSchema['solutionNavigation']> & {
    featureOn: boolean;
  },
  { buildFlavor = 'traditional' }: { buildFlavor?: BuildFlavor } = {}
) => {
  const initializerContext = coreMock.createPluginInitializerContext(
    {
      solutionNavigation: {
        ...defaultConfig,
        ...partialConfig,
      },
    },
    { buildFlavor }
  );
  const plugin = new NavigationPublicPlugin(initializerContext);

  const coreStart = coreMock.createStart();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const cloud = cloudMock.createStart();

  const getGlobalSetting$ = jest.fn();
  const settingsGlobalClient = {
    ...coreStart.settings.globalClient,
    get$: getGlobalSetting$,
  };
  coreStart.settings.globalClient = settingsGlobalClient;

  return { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ };
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

    it('should return flag to indicate that the solution navigation is disabled', () => {
      const { plugin, coreStart, unifiedSearch } = setup({ featureOn });
      expect(plugin.start(coreStart, { unifiedSearch }).isSolutionNavigationEnabled()).toBe(false);
    });
  });

  describe('feature flag enabled', () => {
    const featureOn = true;

    it('should add the default solution navs but **not** set the active nav', () => {
      const { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ } = setup({ featureOn });

      const uiSettingsValues: Record<string, any> = {
        [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // NOT enabled, so we should not set the active nav
        [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
        [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
      };

      getGlobalSetting$.mockImplementation((settingId: string) => {
        const value = uiSettingsValues[settingId];
        return of(value);
      });

      plugin.start(coreStart, { unifiedSearch, cloud });

      expect(coreStart.chrome.project.updateSolutionNavigations).toHaveBeenCalled();
      const [arg] = coreStart.chrome.project.updateSolutionNavigations.mock.calls[0];
      expect(Object.keys(arg)).toEqual(['es', 'oblt']);

      expect(coreStart.chrome.project.changeActiveSolutionNavigation).toHaveBeenCalledWith(null);
    });

    it('should add the default solution navs **and** set the active nav', () => {
      const { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ } = setup({ featureOn });

      const uiSettingsValues: Record<string, any> = {
        [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
        [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
        [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'security',
      };

      getGlobalSetting$.mockImplementation((settingId: string) => {
        const value = uiSettingsValues[settingId] ?? 'unknown';
        return of(value);
      });

      plugin.start(coreStart, { unifiedSearch, cloud });

      expect(coreStart.chrome.project.updateSolutionNavigations).toHaveBeenCalled();

      expect(coreStart.chrome.project.changeActiveSolutionNavigation).toHaveBeenCalledWith(
        uiSettingsValues[DEFAULT_SOLUTION_NAV_UI_SETTING_ID],
        { onlyIfNotSet: true }
      );
    });

    it('if not "visible", should not set the active nav', () => {
      const { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ } = setup({ featureOn });

      const uiSettingsValues: Record<string, any> = {
        [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
        [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'hidden',
        [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'security',
      };

      getGlobalSetting$.mockImplementation((settingId: string) => {
        const value = uiSettingsValues[settingId] ?? 'unknown';
        return of(value);
      });

      plugin.start(coreStart, { unifiedSearch, cloud });

      expect(coreStart.chrome.project.updateSolutionNavigations).toHaveBeenCalled();
      expect(coreStart.chrome.project.changeActiveSolutionNavigation).toHaveBeenCalledWith(null, {
        onlyIfNotSet: true,
      });
    });

    it('should return flag to indicate that the solution navigation is enabled', () => {
      const { plugin, coreStart, unifiedSearch, cloud } = setup({ featureOn });
      expect(plugin.start(coreStart, { unifiedSearch, cloud }).isSolutionNavigationEnabled()).toBe(
        true
      );
    });

    it('on serverless should return flag to indicate that the solution navigation is disabled', () => {
      const { plugin, coreStart, unifiedSearch, cloud } = setup(
        { featureOn },
        { buildFlavor: 'serverless' }
      );
      expect(plugin.start(coreStart, { unifiedSearch, cloud }).isSolutionNavigationEnabled()).toBe(
        false
      );
    });
  });
});
