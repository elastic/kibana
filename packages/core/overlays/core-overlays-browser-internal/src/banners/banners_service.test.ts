/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InternalOverlayBannersStart, OverlayBannersService } from './banners_service';
import { take } from 'rxjs';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('OverlayBannersService', () => {
  let service: InternalOverlayBannersStart;
  beforeEach(() => {
    service = new OverlayBannersService().start({
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      i18n: i18nServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
    });
  });

  const currentBanners = () => service.get$().pipe(take(1)).toPromise();

  describe('adding banners', () => {
    test('adds a single banner', async () => {
      const mount = jest.fn();
      const banner = service.add(mount);
      expect(await currentBanners()).toEqual([{ id: banner, mount, priority: 0 }]);
    });

    test('sorts banners by priority', async () => {
      const mount1 = jest.fn();
      const banner1 = service.add(mount1);
      const mount2 = jest.fn();
      const banner2 = service.add(mount2, 10);
      const mount3 = jest.fn();
      const banner3 = service.add(mount3, 5);
      expect(await currentBanners()).toEqual([
        { id: banner2, mount: mount2, priority: 10 },
        { id: banner3, mount: mount3, priority: 5 },
        { id: banner1, mount: mount1, priority: 0 },
      ]);
    });
  });

  describe('removing banners', () => {
    test('removes a single banner', async () => {
      const mount = jest.fn();
      const banner = service.add(mount);
      expect(service.remove(banner)).toBe(true);
      expect(await currentBanners()).toEqual([]);
      expect(service.remove(banner)).toBe(false);
    });

    test('preserves priority order', async () => {
      const mount1 = jest.fn();
      const banner1 = service.add(mount1);
      const mount2 = jest.fn();
      const banner2 = service.add(mount2, 10);
      const mount3 = jest.fn();
      const banner3 = service.add(mount3, 5);
      service.remove(banner2);
      expect(await currentBanners()).toEqual([
        { id: banner3, mount: mount3, priority: 5 },
        { id: banner1, mount: mount1, priority: 0 },
      ]);
    });
  });

  describe('replacing banners', () => {
    test('replaces mount function', async () => {
      const mount1 = jest.fn();
      const banner = service.add(mount1);
      const mount2 = jest.fn();
      const updatedBanner = service.replace(banner, mount2);
      expect(await currentBanners()).toEqual([{ id: updatedBanner, mount: mount2, priority: 0 }]);
    });

    test('updates priority', async () => {
      const mount1 = jest.fn();
      const banner1 = service.add(mount1);
      const mount2 = jest.fn();
      const banner2 = service.add(mount2, 10);
      const mount3 = jest.fn();
      const banner3 = service.add(mount3, 5);
      const updatedBanner2 = service.replace(banner2, mount2, -10);
      expect(await currentBanners()).toEqual([
        { id: banner3, mount: mount3, priority: 5 },
        { id: banner1, mount: mount1, priority: 0 },
        { id: updatedBanner2, mount: mount2, priority: -10 },
      ]);
    });

    test('can be replaced multiple times using new id', async () => {
      const mount1 = jest.fn();
      const banner = service.add(mount1);
      const mount2 = jest.fn();
      const updatedBanner = service.replace(banner, mount2);
      expect(banner).not.toEqual(updatedBanner);
      // Make sure we can use the new id to replace again
      const mount3 = jest.fn();
      const updatedBanner2 = service.replace(updatedBanner, mount3);
      expect(updatedBanner2).not.toEqual(updatedBanner);
      // Should only be a single banner
      expect(await currentBanners()).toEqual([{ id: updatedBanner2, mount: mount3, priority: 0 }]);
    });
  });
});
