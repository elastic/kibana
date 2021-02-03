/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';

import { BannersList } from './banners_list';
import { BehaviorSubject } from 'rxjs';
import { OverlayBanner } from './banners_service';

describe('BannersList', () => {
  test('renders null if no banners', () => {
    expect(mount(<BannersList banners$={new BehaviorSubject([])} />).html()).toEqual(null);
  });

  test('renders a list of banners', () => {
    const banners$ = new BehaviorSubject<OverlayBanner[]>([
      {
        id: '1',
        mount: (el: HTMLElement) => {
          el.innerHTML = '<h1>Hello!</h1>';
          return () => (el.innerHTML = '');
        },
        priority: 0,
      },
    ]);

    expect(mount(<BannersList banners$={banners$} />).html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"0\\" class=\\"kbnGlobalBannerList__item\\" data-test-subj=\\"global-banner-item\\"><h1>Hello!</h1></div></div>"`
    );
  });

  test('updates banners', () => {
    const unmount = jest.fn();
    const banners$ = new BehaviorSubject<OverlayBanner[]>([
      {
        id: '1',
        mount: (el: HTMLElement) => {
          el.innerHTML = '<h1>Hello!</h1>';
          return unmount;
        },
        priority: 0,
      },
    ]);

    const component = mount(<BannersList banners$={banners$} />);

    act(() => {
      banners$.next([
        {
          id: '1',
          mount: (el: HTMLElement) => {
            el.innerHTML = '<h1>First Banner!</h1>';
            return () => (el.innerHTML = '');
          },
          priority: 1,
        },
        {
          id: '2',
          mount: (el: HTMLElement) => {
            el.innerHTML = '<h1>Second banner!</h1>';
            return () => (el.innerHTML = '');
          },
          priority: 0,
        },
      ]);
    });

    // Two new banners should be rendered
    expect(component.html()).toMatchInlineSnapshot(
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"1\\" class=\\"kbnGlobalBannerList__item\\" data-test-subj=\\"global-banner-item\\"><h1>First Banner!</h1></div><div data-test-priority=\\"0\\" class=\\"kbnGlobalBannerList__item\\" data-test-subj=\\"global-banner-item\\"><h1>Second banner!</h1></div></div>"`
    );
    // Original banner should be unmounted
    expect(unmount).toHaveBeenCalled();
  });

  test('unsubscribe on unmount', () => {
    const banners$ = new BehaviorSubject([]);
    const subscribe = jest.spyOn(banners$, 'subscribe');
    const component = mount(<BannersList banners$={banners$} />);
    // Grab the returned subscription and spy its `unsubscribe` method
    const subscription = subscribe.mock.results[0].value;
    const unsubscribe = jest.spyOn(subscription, 'unsubscribe');

    component.unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
