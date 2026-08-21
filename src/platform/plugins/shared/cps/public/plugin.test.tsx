/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { CPS_TIER_ELIGIBLE_FEATURE_ID } from '@kbn/cps-common';

import {
  CpsPlugin,
  getCustomHeaderContextMenuItems,
  getManageCrossProjectSearchUrl,
} from './plugin';

describe('CpsPlugin (public)', () => {
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
  });

  describe('getManageCrossProjectSearchUrl()', () => {
    it('builds the Cloud console URL when baseUrl, projectType, and projectId are present', () => {
      const cloud = cloudMock.createStart();
      cloud.baseUrl = 'https://cloud.elastic.co';
      cloud.serverless = {
        projectId: 'c40ee170061b48cd874e8ed896cdd48e',
        projectType: 'security',
      };

      expect(getManageCrossProjectSearchUrl(cloud)).toBe(
        'https://cloud.elastic.co/projects/security/c40ee170061b48cd874e8ed896cdd48e/cross-project-search'
      );
    });

    it('handles a trailing slash on baseUrl', () => {
      const cloud = cloudMock.createStart();
      cloud.baseUrl = 'https://cloud.elastic.co/';
      cloud.serverless = {
        projectId: 'abc123',
        projectType: 'observability',
      };

      expect(getManageCrossProjectSearchUrl(cloud)).toBe(
        'https://cloud.elastic.co/projects/observability/abc123/cross-project-search'
      );
    });

    it('returns undefined when any required piece is missing', () => {
      expect(getManageCrossProjectSearchUrl(undefined)).toBeUndefined();
      expect(getManageCrossProjectSearchUrl(cloudMock.createStart())).toBeUndefined();

      const missingType = cloudMock.createStart();
      missingType.baseUrl = 'https://cloud.elastic.co';
      missingType.serverless = { projectId: 'abc123' };
      expect(getManageCrossProjectSearchUrl(missingType)).toBeUndefined();
    });
  });

  describe('getCustomHeaderContextMenuItems()', () => {
    it('always includes the adjust space defaults entry', () => {
      const coreStart = coreMock.createStart();

      Object.defineProperty(coreStart.http, 'spaceId', {
        value: 'default',
      });

      coreStart.application.getUrlForApp.mockReturnValue(
        '/app/management/kibana/spaces/edit/default'
      );

      const items = getCustomHeaderContextMenuItems(coreStart);

      expect(items).toHaveLength(1);
      expect(items[0].href).toBe('/app/management/kibana/spaces/edit/default');
    });

    it('includes manage cross-project search only when the Cloud URL can be built', () => {
      const coreStart = coreMock.createStart();
      const cloud = cloudMock.createStart();
      cloud.baseUrl = 'https://cloud.elastic.co';
      cloud.serverless = {
        projectId: 'c40ee170061b48cd874e8ed896cdd48e',
        projectType: 'security',
      };

      const items = getCustomHeaderContextMenuItems(coreStart, cloud);

      expect(items).toHaveLength(2);
      expect(items[1].href).toBe(
        'https://cloud.elastic.co/projects/security/c40ee170061b48cd874e8ed896cdd48e/cross-project-search'
      );
      expect(items[1].external).toBe(true);
    });

    it('omits manage cross-project search when the Cloud URL cannot be built', () => {
      const coreStart = coreMock.createStart();
      const items = getCustomHeaderContextMenuItems(coreStart, cloudMock.createStart());

      expect(items).toHaveLength(1);
      expect(items.some((item) => item.href?.includes('cross-project-search'))).toBe(false);
    });
  });
});
