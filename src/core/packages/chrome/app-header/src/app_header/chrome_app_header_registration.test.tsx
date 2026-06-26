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
import type { AppHeaderConfig } from '@kbn/core-chrome-browser';
import {
  ChromeAppHeaderRegistration,
  useChromeAppHeaderRegistration,
} from './chrome_app_header_registration';

const Registration = ({ config }: { config: AppHeaderConfig }) => {
  useChromeAppHeaderRegistration(config);
  return null;
};

describe('useChromeAppHeaderRegistration', () => {
  it('unregisters the previous config before registering an update', () => {
    const chrome = chromeServiceMock.createStartContract();
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => true });
    chrome.getChromeStyle.mockReturnValue('project');

    const firstUnregister = jest.fn();
    const secondUnregister = jest.fn();
    chrome.next.appHeader.set
      .mockReturnValueOnce(firstUnregister)
      .mockReturnValueOnce(secondUnregister);

    const { rerender, unmount } = render(
      <ChromeServiceProvider value={{ chrome }}>
        <Registration config={{ title: 'First' }} />
      </ChromeServiceProvider>
    );

    expect(firstUnregister).not.toHaveBeenCalled();

    rerender(
      <ChromeServiceProvider value={{ chrome }}>
        <Registration config={{ title: 'Second' }} />
      </ChromeServiceProvider>
    );

    expect(firstUnregister).toHaveBeenCalledTimes(1);
    expect(secondUnregister).not.toHaveBeenCalled();

    unmount();

    expect(secondUnregister).toHaveBeenCalledTimes(1);
  });

  it('registers metadata updates from component props', () => {
    const chrome = chromeServiceMock.createStartContract();
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => true });
    chrome.getChromeStyle.mockReturnValue('project');
    chrome.next.appHeader.set.mockReturnValue(jest.fn());

    const { rerender } = render(
      <ChromeServiceProvider value={{ chrome }}>
        <ChromeAppHeaderRegistration metadata={[{ type: 'text', label: 'Created by: analyst' }]} />
      </ChromeServiceProvider>
    );

    rerender(
      <ChromeServiceProvider value={{ chrome }}>
        <ChromeAppHeaderRegistration metadata={[{ type: 'text', label: 'Updated by: analyst' }]} />
      </ChromeServiceProvider>
    );

    expect(chrome.next.appHeader.set).toHaveBeenLastCalledWith({
      title: undefined,
      back: undefined,
      tabs: undefined,
      badges: undefined,
      menu: undefined,
      favorite: undefined,
      metadata: [{ type: 'text', label: 'Updated by: analyst' }],
    });
  });
});
