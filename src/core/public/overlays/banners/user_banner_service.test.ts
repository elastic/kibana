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

import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';
import { UserBannerService } from './user_banner_service';
import { overlayBannersServiceMock } from './banners_service.mock';
import { i18nServiceMock } from '../../i18n/i18n_service.mock';
import { Subject } from 'rxjs';

describe('OverlayBannersService', () => {
  let bannerContent: string | undefined;
  let service: UserBannerService;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let banners: ReturnType<typeof overlayBannersServiceMock.createStartContract>;

  const startService = (content?: string) => {
    bannerContent = content;
    uiSettings = uiSettingsServiceMock.createStartContract();
    uiSettings.get.mockImplementation((key: string) => {
      if (key === 'notifications:banner') {
        return bannerContent;
      } else if (key === 'notifications:lifetime:banner') {
        return 1000;
      }
    });

    banners = overlayBannersServiceMock.createStartContract();
    service = new UserBannerService();
    service.start({
      banners,
      i18n: i18nServiceMock.createStartContract(),
      uiSettings,
    });
  };

  afterEach(() => service.stop());

  it('does not add banner if setting is unspecified', () => {
    startService();
    expect(banners.replace).not.toHaveBeenCalled();
  });

  it('adds banner if setting is specified', () => {
    startService('testing banner!');
    expect(banners.replace).toHaveBeenCalled();

    const mount = banners.replace.mock.calls[0][1];
    const div = document.createElement('div');
    mount(div);
    expect(div.querySelector('.euiCallOut')).toBeInstanceOf(HTMLDivElement);
  });

  it('dismisses banner after timeout', async () => {
    jest.useFakeTimers();
    startService('testing banner!');
    expect(banners.remove).not.toHaveBeenCalled();

    // Must mount in order for timer to start
    const mount = banners.replace.mock.calls[0][1];
    mount(document.createElement('div'));
    // Process all timers
    jest.runAllTimers();
    expect(banners.remove).toHaveBeenCalled();
  });

  it('updates banner on change', () => {
    startService();
    expect(banners.replace).toHaveBeenCalledTimes(0);

    const update$ = (uiSettings.getUpdate$() as any) as Subject<{
      key: string;
    }>;

    bannerContent = 'update 1';
    update$.next({ key: 'notifications:banner' });
    expect(banners.replace).toHaveBeenCalledTimes(1);

    bannerContent = 'update 2';
    update$.next({ key: 'notifications:banner' });
    expect(banners.replace).toHaveBeenCalledTimes(2);
  });

  it('removes banner when changed to empty string', () => {
    startService('remove me!');
    const update$ = (uiSettings.getUpdate$() as any) as Subject<{
      key: string;
    }>;

    bannerContent = '';
    update$.next({ key: 'notifications:banner' });
    expect(banners.remove).toHaveBeenCalled();
  });

  it('removes banner when changed to undefined', () => {
    startService('remove me!');
    const update$ = (uiSettings.getUpdate$() as any) as Subject<{
      key: string;
    }>;

    bannerContent = undefined;
    update$.next({ key: 'notifications:banner' });
    expect(banners.remove).toHaveBeenCalled();
  });

  it('does not update banner if other settings change', () => {
    startService('initial banner!');
    expect(banners.replace).toHaveBeenCalledTimes(1);

    const update$ = (uiSettings.getUpdate$() as any) as Subject<{
      key: string;
    }>;

    update$.next({ key: 'other:setting' });
    expect(banners.replace).toHaveBeenCalledTimes(1); // still only the initial call
  });
});
