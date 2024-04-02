/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { firstValueFrom, of } from 'rxjs';
import type { BuildFlavor } from '@kbn/config';
import type { UserSettingsData } from '@kbn/user-profile-components';
import {
  DEFAULT_SOLUTION_NAV_UI_SETTING_ID,
  ENABLE_SOLUTION_NAV_UI_SETTING_ID,
  OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID,
} from '../common';
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
  featureOn: true,
  enabled: true,
  optInStatus: 'visible',
  defaultSolution: 'es',
};

const setup = (
  partialConfig: Partial<ConfigSchema['solutionNavigation']> & {
    featureOn: boolean;
  },
  {
    buildFlavor = 'traditional',
    userSettings = {},
  }: { buildFlavor?: BuildFlavor; userSettings?: UserSettingsData } = {}
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
  const security = securityMock.createStart();
  security.userProfiles.userProfileLoaded$ = of(true);
  security.userProfiles.userProfile$ = of({ userSettings });

  const getGlobalSetting$ = jest.fn();
  const settingsGlobalClient = {
    ...coreStart.settings.globalClient,
    get$: getGlobalSetting$,
  };
  coreStart.settings.globalClient = settingsGlobalClient;

  return { plugin, coreStart, unifiedSearch, cloud, security, getGlobalSetting$ };
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

    it('should add the opt in/out toggle in the user menu', () => {
      const { plugin, coreStart, unifiedSearch, cloud, security, getGlobalSetting$ } = setup({
        featureOn,
      });

      const uiSettingsValues: Record<string, any> = {
        [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
        [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
        [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
      };

      getGlobalSetting$.mockImplementation((settingId: string) => {
        const value = uiSettingsValues[settingId] ?? 'unknown';
        return of(value);
      });

      plugin.start(coreStart, { unifiedSearch, cloud, security });

      expect(security.navControlService.addUserMenuLinks).toHaveBeenCalled();
      const [menuLink] = security.navControlService.addUserMenuLinks.mock.calls[0][0];
      expect((menuLink.content as any)?.type).toBe(SolutionNavUserProfileToggle);
    });

    describe('isSolutionNavEnabled$', () => {
      describe('user has not opted in or out (undefined)', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should be enabled',
            true,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'hidden', // not visible
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ } = setup(
              {
                featureOn,
              },
              { userSettings: { solutionNavOptOut: undefined } } // user has not opted in or out
            );

            getGlobalSetting$.mockImplementation((settingId: string) => {
              const value = uiSettingsValues[settingId] ?? 'unknown';
              return of(value);
            });

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, { unifiedSearch, cloud });
            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      describe('user has opted in', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should be enabled',
            true,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'hidden', // not visible
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should be enabled',
            true,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, security, getGlobalSetting$ } = setup(
              {
                featureOn,
              },
              { userSettings: { solutionNavOptOut: false } } // user has opted in
            );

            getGlobalSetting$.mockImplementation((settingId: string) => {
              const value = uiSettingsValues[settingId] ?? 'unknown';
              return of(value);
            });

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
              security,
              unifiedSearch,
              cloud,
            });
            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      describe('user has opted out', () => {
        const testCases: Array<[Record<string, any>, string, boolean]> = [
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: false, // feature not enabled
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
          [
            {
              [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true,
              [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'hidden',
              [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
            },
            'should not be enabled',
            false,
          ],
        ];

        testCases.forEach(([uiSettingsValues, description, expected]) => {
          it(description, async () => {
            const { plugin, coreStart, unifiedSearch, cloud, security, getGlobalSetting$ } = setup(
              {
                featureOn,
              },
              { userSettings: { solutionNavOptOut: true } } // user has opted out
            );

            getGlobalSetting$.mockImplementation((settingId: string) => {
              const value = uiSettingsValues[settingId] ?? 'unknown';
              return of(value);
            });

            const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
              security,
              unifiedSearch,
              cloud,
            });
            expect(await firstValueFrom(isSolutionNavEnabled$)).toBe(expected);
          });
        });
      });

      it('on serverless should flag must be disabled', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, getGlobalSetting$ } = setup(
          { featureOn },
          { buildFlavor: 'serverless' }
        );
        const uiSettingsValues: Record<string, any> = {
          [ENABLE_SOLUTION_NAV_UI_SETTING_ID]: true, // enabled, but we are on serverless
          [OPT_IN_STATUS_SOLUTION_NAV_UI_SETTING_ID]: 'visible', // should not matter
          [DEFAULT_SOLUTION_NAV_UI_SETTING_ID]: 'es',
        };

        getGlobalSetting$.mockImplementation((settingId: string) => {
          const value = uiSettingsValues[settingId] ?? 'unknown';
          return of(value);
        });

        const { isSolutionNavEnabled$ } = plugin.start(coreStart, { unifiedSearch, cloud });
        const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
        expect(isEnabled).toBe(false);
      });
    });
  });
});
