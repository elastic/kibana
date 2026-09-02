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
import { render } from '@testing-library/react';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { AppHeaderLoading, AppHeaderLoadingView } from './app_header_loading';

const renderLoading = (
  ui: React.ReactElement,
  chrome = chromeServiceMock.createStartContract()
) => {
  return {
    chrome,
    ...render(<ChromeServiceProvider value={{ chrome }}>{ui}</ChromeServiceProvider>),
  };
};

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
