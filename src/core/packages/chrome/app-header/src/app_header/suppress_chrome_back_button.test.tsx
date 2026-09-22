/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { SuppressChromeBackButton } from './suppress_chrome_back_button';

describe('SuppressChromeBackButton', () => {
  it('registers back: false when Chrome Next project style is active', () => {
    const chrome = chromeServiceMock.createStartContract();
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => true });
    chrome.getChromeStyle.mockReturnValue('project');
    chrome.next.appHeader.set.mockReturnValue(jest.fn());

    render(
      <ChromeServiceProvider value={{ chrome }}>
        <SuppressChromeBackButton />
      </ChromeServiceProvider>
    );

    expect(chrome.next.appHeader.set).toHaveBeenCalledWith({
      title: undefined,
      back: false,
      tabs: undefined,
      badges: undefined,
      menu: undefined,
      favorite: undefined,
      metadata: undefined,
    });
  });

  it('does not register outside Chrome Next project style', () => {
    const chrome = chromeServiceMock.createStartContract();
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => false });
    chrome.getChromeStyle.mockReturnValue('classic');
    chrome.next.appHeader.set.mockReturnValue(jest.fn());

    render(
      <ChromeServiceProvider value={{ chrome }}>
        <SuppressChromeBackButton />
      </ChromeServiceProvider>
    );

    expect(chrome.next.appHeader.set).not.toHaveBeenCalled();
  });
});
