/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { UserBannerService } from './user_banner_service';
import { overlayBannersServiceMock } from './banners_service.test.mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { Subject } from 'rxjs';

describe('OverlayBannersService', () => {
  let bannerContent: string | undefined;
  let service: UserBannerService;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let banners: ReturnType<typeof overlayBannersServiceMock.createStartContract>;
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;

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
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      i18n: i18nServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
      uiSettings,
      userProfile,
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
    jest.useFakeTimers({ legacyFakeTimers: true });
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

    const update$ = uiSettings.getUpdate$() as any as Subject<{
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
    const update$ = uiSettings.getUpdate$() as any as Subject<{
      key: string;
    }>;

    bannerContent = '';
    update$.next({ key: 'notifications:banner' });
    expect(banners.remove).toHaveBeenCalled();
  });

  it('removes banner when changed to undefined', () => {
    startService('remove me!');
    const update$ = uiSettings.getUpdate$() as any as Subject<{
      key: string;
    }>;

    bannerContent = undefined;
    update$.next({ key: 'notifications:banner' });
    expect(banners.remove).toHaveBeenCalled();
  });

  it('does not update banner if other settings change', () => {
    startService('initial banner!');
    expect(banners.replace).toHaveBeenCalledTimes(1);

    const update$ = uiSettings.getUpdate$() as any as Subject<{
      key: string;
    }>;

    update$.next({ key: 'other:setting' });
    expect(banners.replace).toHaveBeenCalledTimes(1); // still only the initial call
  });
});
