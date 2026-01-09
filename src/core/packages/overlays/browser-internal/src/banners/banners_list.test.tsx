/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import { BannersList } from './banners_list';
import { BehaviorSubject } from 'rxjs';
import type { OverlayBanner } from './banners_service';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>{children}</EuiThemeProvider>
);

describe('BannersList', () => {
  test('renders null if no banners', () => {
    const { container } = render(<BannersList banners$={new BehaviorSubject([])} />);
    expect(container.innerHTML).toEqual('');
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

    const { container } = render(
      <Wrapper>
        <BannersList banners$={banners$} />
      </Wrapper>
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"0\\" data-test-subj=\\"global-banner-item\\" class=\\"css-rhtlbg-BannerItem\\"><h1>Hello!</h1></div></div>"`
    );
  });

  test('updates banners', async () => {
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

    const { container } = render(
      <Wrapper>
        <BannersList banners$={banners$} />
      </Wrapper>
    );

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

    // Wait for the component to re-render with new banners
    await waitFor(() => {
      expect(container.innerHTML).toContain('First Banner!');
    });

    // Two new banners should be rendered
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div class=\\"kbnGlobalBannerList\\"><div data-test-priority=\\"1\\" data-test-subj=\\"global-banner-item\\" class=\\"css-rhtlbg-BannerItem\\"><h1>First Banner!</h1></div><div data-test-priority=\\"0\\" data-test-subj=\\"global-banner-item\\" class=\\"css-rhtlbg-BannerItem\\"><h1>Second banner!</h1></div></div>"`
    );
    // Original banner should be unmounted
    expect(unmount).toHaveBeenCalled();
  });

  test('unsubscribe on unmount', () => {
    const banners$ = new BehaviorSubject([]);
    const subscribe = jest.spyOn(banners$, 'subscribe');
    const { unmount } = render(<BannersList banners$={banners$} />);
    // Grab the returned subscription and spy its `unsubscribe` method
    const subscription = subscribe.mock.results[0].value;
    const unsubscribe = jest.spyOn(subscription, 'unsubscribe');

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
