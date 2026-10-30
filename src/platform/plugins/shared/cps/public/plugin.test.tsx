/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { CPS_TIER_ELIGIBLE_FEATURE_ID } from '@kbn/cps-common';

import { CpsPlugin } from './plugin';
import { CPSManager } from './services/cps_manager';

jest.mock('./services/cps_manager');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CpsPlugin (public)', () => {
  const mockLinkedProjects = (hasLinkedProjects: boolean) => {
    jest.mocked(CPSManager).mockImplementation(
      () =>
        ({
          whenReady: () => Promise.resolve(),
          hasLinkedProjects: () => hasLinkedProjects,
        } as unknown as CPSManager)
    );
  };

  beforeEach(() => {
    mockLinkedProjects(false);
  });

  const buildPlugin = (cpsEnabled: boolean) => {
    const initContext = coreMock.createPluginInitializerContext({ cpsEnabled });
    return new CpsPlugin(initContext);
  };

  describe('start()', () => {
    it('exposes isTierEligible=true when core.pricing reports the CPS feature as available', () => {
      const plugin = buildPlugin(true);
      plugin.setup(coreMock.createSetup());

      const coreStart = coreMock.createStart();
      const isFeatureAvailableSpy = jest
        .spyOn(coreStart.pricing, 'isFeatureAvailable')
        .mockReturnValue(true);

      const start = plugin.start(coreStart, {});

      expect(isFeatureAvailableSpy).toHaveBeenCalledWith(CPS_TIER_ELIGIBLE_FEATURE_ID);
      expect(start.isTierEligible).toBe(true);
    });

    it('exposes isTierEligible=false when core.pricing reports the feature as unavailable', () => {
      const plugin = buildPlugin(true);
      plugin.setup(coreMock.createSetup());

      const coreStart = coreMock.createStart();
      jest.spyOn(coreStart.pricing, 'isFeatureAvailable').mockReturnValue(false);

      const start = plugin.start(coreStart, {});

      expect(start.isTierEligible).toBe(false);
    });

    it('still resolves isTierEligible when cpsEnabled is false', () => {
      const plugin = buildPlugin(false);
      plugin.setup(coreMock.createSetup());

      const coreStart = coreMock.createStart();
      jest.spyOn(coreStart.pricing, 'isFeatureAvailable').mockReturnValue(true);

      const start = plugin.start(coreStart, {});

      expect(start.cpsManager).toBeUndefined();
      expect(start.isTierEligible).toBe(true);
    });

    it('registers the project picker when there are linked projects', async () => {
      mockLinkedProjects(true);
      const plugin = buildPlugin(true);
      plugin.setup(coreMock.createSetup());
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {});
      await flushPromises();

      expect(coreStart.chrome.controls.projectPicker.set).toHaveBeenCalledTimes(1);
    });

    it('does not register the project picker without linked projects', async () => {
      const plugin = buildPlugin(true);
      plugin.setup(coreMock.createSetup());
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {});
      await flushPromises();

      expect(coreStart.chrome.controls.projectPicker.set).not.toHaveBeenCalled();
    });
  });
});
