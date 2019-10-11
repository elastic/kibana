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
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"0\\" class=\\"kbnGlobalBannerList__item\\"><h1>Hello!</h1></div></div>"`
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
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"1\\" class=\\"kbnGlobalBannerList__item\\"><h1>First Banner!</h1></div><div data-test-priority=\\"0\\" class=\\"kbnGlobalBannerList__item\\"><h1>Second banner!</h1></div></div>"`
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
