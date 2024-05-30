/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { cloudExperimentsMock } from '@kbn/cloud-experiments-plugin/common/mocks';
import type { BuildFlavor } from '@kbn/config';
import type { UserSettingsData } from '@kbn/user-profile-components';
import { ENABLE_SOLUTION_NAV_UI_SETTING_ID, SOLUTION_NAV_FEATURE_FLAG_NAME } from '../common';
import { NavigationPublicPlugin } from './plugin';
import { ConfigSchema } from './types';
import { SolutionNavUserProfileToggle } from './solution_nav_userprofile_toggle';

jest.mock('rxjs', () => {
  const original = jest.requireActual('rxjs');
  return {
    ...original,
    debounceTime: () => (source: any) => source,
  };
});

const defaultConfig: ConfigSchema['solutionNavigation'] = {
  enabled: true,
  defaultSolution: 'es',
};

const setup = (
  partialConfig: Partial<ConfigSchema['solutionNavigation']> & {
    featureOn: boolean;
  },
  {
    buildFlavor = 'traditional',
    userSettings = {},
    uiSettingsValues,
  }: {
    buildFlavor?: BuildFlavor;
    userSettings?: UserSettingsData;
    uiSettingsValues?: Record<string, any>;
  } = {}
) => {
  const config = {
    solutionNavigation: {
      ...defaultConfig,
      ...partialConfig,
    },
  };

  const initializerContext = coreMock.createPluginInitializerContext(config, { buildFlavor });
  const plugin = new NavigationPublicPlugin(initializerContext);

  const setChromeStyle = jest.fn();
  const coreStart = coreMock.createStart();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const cloud = cloudMock.createStart();
  const security = securityMock.createStart();
  const cloudExperiments = cloudExperimentsMock.createStartMock();
  cloudExperiments.getVariation.mockImplementation((key) => {
    if (key === SOLUTION_NAV_FEATURE_FLAG_NAME) {
      return Promise.resolve(partialConfig.featureOn);
    }
    return Promise.resolve(false);
  });

  security.userProfiles.userProfileLoaded$ = of(true);
  security.userProfiles.userProfile$ = of({ userSettings });

  const getGlobalSetting$ = jest.fn();
  if (uiSettingsValues) {
    getGlobalSetting$.mockImplementation((settingId: string) =>
      of(uiSettingsValues[settingId] ?? 'unknown')
    );
  }
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
    security,
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

    it('should add the opt in/out toggle in the user menu', async () => {
      const uiSettingsValues: Record<string, any> = {
        [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
      };

      const { plugin, coreStart, unifiedSearch, cloud, security, cloudExperiments } = setup(
        {
          featureOn,
        },
        { uiSettingsValues }
      );

      plugin.start(coreStart, { unifiedSearch, cloud, security, cloudExperiments });
      await new Promise((resolve) => setTimeout(resolve));

      expect(security.navControlService.addUserMenuLinks).toHaveBeenCalled();
      const [menuLink] = security.navControlService.addUserMenuLinks.mock.calls[0][0];
      expect((menuLink.content as any)?.type).toBe(SolutionNavUserProfileToggle);
    });

    describe('set Chrome style', () => {
      it('should set the Chrome style to "classic" when the feature is not enabled', async () => {
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
        };

        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: false }, // feature not enabled
          { uiSettingsValues }
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');
      });

      it('should set the Chrome style to "classic" when the feature is enabled BUT globalSettings is disabled', async () => {
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // Global setting disabled
        };

        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: true }, // feature enabled
          { uiSettingsValues }
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');
      });

      it('should NOT set the Chrome style when the feature is enabled, globalSettings is enabled BUT on serverless', async () => {
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true, // Global setting enabled
        };

        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: true }, // feature enabled
          { uiSettingsValues, buildFlavor: 'serverless' }
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).not.toHaveBeenCalled();
      });

      it('should set the Chrome style to "project" when the feature is enabled', async () => {
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
        };

        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: true },
          { uiSettingsValues }
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('project');
      });
    });

    describe('isSolutionNavEnabled$', () => {
      describe('user has not opted in or out (undefined)', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
            },
            'should be enabled',
            true,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
            },
            'should not be enabled',
            false,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
              {
                featureOn,
              },
              {
                userSettings: {
                  // user has not opted in or out
                  solutionNavOptOut: undefined,
                },
                uiSettingsValues,
              }
            );

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
              unifiedSearch,
              cloud,
              cloudExperiments,
            });
            await new Promise((resolve) => setTimeout(resolve));

            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      describe('user has opted in', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
            },
            'should be enabled',
            true,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
            },
            'should not be enabled',
            false,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, security, cloudExperiments } = setup(
              {
                featureOn,
              },
              {
                userSettings: {
                  // user has opted in
                  solutionNavOptOut: false,
                },
                uiSettingsValues,
              }
            );

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
              security,
              unifiedSearch,
              cloud,
              cloudExperiments,
            });
            await new Promise((resolve) => setTimeout(resolve));

            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      describe('user has opted out', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
            },
            'should not be enabled',
            false,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
            },
            'should not be enabled',
            false,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, security, cloudExperiments } = setup(
              {
                featureOn,
              },
              { userSettings: { solutionNavOptOut: true }, uiSettingsValues } // user has opted out
            );

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
              security,
              unifiedSearch,
              cloud,
              cloudExperiments,
            });
            await new Promise((resolve) => setTimeout(resolve));

            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      it('on serverless should flag must be disabled', async () => {
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true, // enabled, but we are on serverless
        };

        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn },
          { buildFlavor: 'serverless', uiSettingsValues }
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
