/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { OverlayBannersService, OverlayBannersStart } from './banners_service';
import { take } from 'rxjs/operators';
import { i18nServiceMock } from '../../i18n/i18n_service.mock';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';

describe('OverlayBannersService', () => {
  let service: OverlayBannersStart;
  beforeEach(() => {
    service = new OverlayBannersService().start({
      i18n: i18nServiceMock.createStartContract(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
    });
  });

  const currentBanners = () =>
    service
      .get$()
      .pipe(take(1))
      .toPromise();

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
