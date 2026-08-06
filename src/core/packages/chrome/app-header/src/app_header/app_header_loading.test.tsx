/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { APP_MENU_ITEM_LIMIT } from '@kbn/app-menu';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { AppHeaderLoading, AppHeaderLoadingView } from './app_header_loading';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

const renderLoading = (
  ui: React.ReactElement,
  chrome = chromeServiceMock.createStartContract()
) => {
  return {
    chrome,
    ...render(<ChromeServiceProvider value={{ chrome }}>{ui}</ChromeServiceProvider>),
  };
};

const menuRectangles = (): NodeListOf<Element> =>
  screen
    .getByTestId(APP_HEADER_TEST_SUBJECTS.skeletonMenu)
    .querySelectorAll('.euiSkeletonRectangle');

describe('AppHeaderLoadingView', () => {
  it('skeletons the title and the default overflow + primary menu', () => {
    renderLoading(<AppHeaderLoadingView />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeleton)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeletonMenu)).toBeInTheDocument();
    expect(menuRectangles()).toHaveLength(2);
  });

  it('keeps the back button next to the title skeleton', () => {
    renderLoading(<AppHeaderLoadingView back="/app/my-app" />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/my-app'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.skeleton)).toBeInTheDocument();
  });

  it('customizes the menu skeleton', () => {
    renderLoading(<AppHeaderLoadingView menu={{ buttonCount: 2, hasPrimary: false }} />);

    expect(menuRectangles()).toHaveLength(2);
  });

  it('clamps buttonCount to APP_MENU_ITEM_LIMIT', () => {
    renderLoading(<AppHeaderLoadingView menu={{ buttonCount: 99 }} />);

    expect(menuRectangles()).toHaveLength(APP_MENU_ITEM_LIMIT + 1);
  });
});

describe('AppHeaderLoading', () => {
  it('claims the inline app-header slot and releases it on unmount', () => {
    const chrome = chromeServiceMock.createStartContract();
    const { unmount } = renderLoading(<AppHeaderLoading />, chrome);

    expect(chrome.next.inlineAppHeader.set).toHaveBeenCalledWith(true);

    unmount();

    expect(chrome.next.inlineAppHeader.set).toHaveBeenCalledWith(false);
  });

  it('does not claim the slot when only the view is rendered', () => {
    const chrome = chromeServiceMock.createStartContract();
    renderLoading(<AppHeaderLoadingView />, chrome);

    expect(chrome.next.inlineAppHeader.set).not.toHaveBeenCalled();
  });
});
