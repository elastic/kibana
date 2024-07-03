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
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { cloudExperimentsMock } from '@kbn/cloud-experiments-plugin/common/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { Space } from '@kbn/spaces-plugin/public';
import type { BuildFlavor } from '@kbn/config';
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
  }: {
    buildFlavor?: BuildFlavor;
  } = {}
) => {
  const initializerContext = coreMock.createPluginInitializerContext({}, { buildFlavor });
  const plugin = new NavigationPublicPlugin(initializerContext);

  const setChromeStyle = jest.fn();
  const coreStart = coreMock.createStart();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const cloud = cloudMock.createStart();
  const cloudExperiments = cloudExperimentsMock.createStartMock();
  const spaces = spacesPluginMock.createStartContract();
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
    spaces,
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

    it('should change the active solution navigation', async () => {
      const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments, spaces } = setup({
        featureOn,
      });

      spaces.getActiveSpace$ = jest
        .fn()
        .mockReturnValue(of({ solution: 'es' } as Pick<Space, 'solution'>));

      plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments, spaces });
      await new Promise((resolve) => setTimeout(resolve));

      expect(coreStart.chrome.project.changeActiveSolutionNavigation).toHaveBeenCalledWith('es');
    });

    describe('addSolutionNavigation()', () => {
      it('should update the solution navigation definitions', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup({
          featureOn,
        });

        const { addSolutionNavigation } = plugin.start(coreStart, {
          unifiedSearch,
          cloud,
          cloudExperiments,
        });
        await new Promise((resolve) => setTimeout(resolve));

        const definition = {
          id: 'es',
          title: 'Elasticsearch',
          navigationTree$: of({ body: [] }),
        };
        addSolutionNavigation(definition);

        await new Promise((resolve) => setTimeout(resolve));

        expect(coreStart.chrome.project.updateSolutionNavigations).toHaveBeenCalledWith({
          es: {
            ...definition,
            sideNavComponent: expect.any(Function),
          },
        });
      });
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

      it('should set the Chrome style to "classic" when spaces plugin is not available', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments } = setup(
          { featureOn: true } // feature not enabled but no spaces plugin
        );

        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');
      });

      it('should set the Chrome style to "classic" when active space solution is "classic"', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments, spaces } = setup({
          featureOn: true,
        });

        // Spaces plugin is available but activeSpace is undefined
        spaces.getActiveSpace$ = jest.fn().mockReturnValue(of(undefined));
        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments, spaces });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');

        // Spaces plugin is available and activeSpace has solution "classic"
        coreStart.chrome.setChromeStyle.mockReset();
        spaces.getActiveSpace$ = jest
          .fn()
          .mockReturnValue(of({ solution: 'classic' } as Pick<Space, 'solution'>));
        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments, spaces });
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

      it('should set the Chrome style to "project" when space solution is a known solution', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments, spaces } = setup({
          featureOn: true,
        });

        for (const solution of ['es', 'oblt', 'security']) {
          spaces.getActiveSpace$ = jest
            .fn()
            .mockReturnValue(of({ solution } as Pick<Space, 'solution'>));
          plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments, spaces });
          await new Promise((resolve) => setTimeout(resolve));
          expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('project');
          coreStart.chrome.setChromeStyle.mockReset();
        }

        spaces.getActiveSpace$ = jest.fn().mockReturnValue(of({ solution: 'unknown' }));
        plugin.start(coreStart, { unifiedSearch, cloud, cloudExperiments, spaces });
        await new Promise((resolve) => setTimeout(resolve));
        expect(coreStart.chrome.setChromeStyle).toHaveBeenCalledWith('classic');
      });
    });

    describe('isSolutionNavEnabled$', () => {
      // This test will need to be changed when we remove the feature flag
      it('should be off by default', async () => {
        const { plugin, coreStart, unifiedSearch, cloud } = setup({ featureOn });

        const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
          unifiedSearch,
          cloud,
        });
        await new Promise((resolve) => setTimeout(resolve));

        const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
        expect(isEnabled).toBe(false);
      });

      it('should be off if feature flag if "ON" but space solution is "classic" or "undefined"', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments, spaces } = setup({
          featureOn,
        });

        cloudExperiments.getVariation.mockResolvedValue(true); // Feature flag ON

        {
          spaces.getActiveSpace$ = jest
            .fn()
            .mockReturnValue(of({ solution: undefined } as Pick<Space, 'solution'>));

          const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
            unifiedSearch,
            cloud,
            cloudExperiments,
            spaces,
          });
          await new Promise((resolve) => setTimeout(resolve));

          const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
          expect(isEnabled).toBe(false);
        }

        {
          spaces.getActiveSpace$ = jest
            .fn()
            .mockReturnValue(of({ solution: 'classic' } as Pick<Space, 'solution'>));

          const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
            unifiedSearch,
            cloud,
            cloudExperiments,
            spaces,
          });
          await new Promise((resolve) => setTimeout(resolve));

          const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
          expect(isEnabled).toBe(false);
        }
      });

      it('should be on if feature flag if "ON" and space solution is set', async () => {
        const { plugin, coreStart, unifiedSearch, cloud, cloudExperiments, spaces } = setup({
          featureOn,
        });

        cloudExperiments.getVariation.mockResolvedValue(true); // Feature flag ON

        spaces.getActiveSpace$ = jest
          .fn()
          .mockReturnValue(of({ solution: 'es' } as Pick<Space, 'solution'>));

        const { isSolutionNavEnabled$ } = plugin.start(coreStart, {
          unifiedSearch,
          cloud,
          cloudExperiments,
          spaces,
        });
        await new Promise((resolve) => setTimeout(resolve));

        const isEnabled = await firstValueFrom(isSolutionNavEnabled$);
        expect(isEnabled).toBe(true);
      });

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
