/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { BehaviorSubject, Subject } from 'rxjs';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { TestChromeProviders } from '../../test_helpers';
import { ChromeNextGlobalHeader } from './global_header';

describe('ChromeNextGlobalHeader', () => {
  it('renders the help menu button', async () => {
    renderWithI18n(
      <TestChromeProviders>
        <ChromeNextGlobalHeader />
      </TestChromeProviders>
    );

    await userEvent.click(screen.getByTestId('chromeNextGlobalHeaderHelpButton'));

    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Kibana documentation')).toBeInTheDocument();
  });

  it('renders a registered newsfeed handler in the help menu', async () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getChromeStyle.mockReturnValue('project');
    chrome.getChromeStyle$.mockReturnValue(new BehaviorSubject('project'));
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => true });
    chrome.getNewsfeedHandler$.mockReturnValue(
      new BehaviorSubject({
        open: jest.fn(),
        hasNew$: new BehaviorSubject(false),
      })
    );

    renderWithI18n(
      <TestChromeProviders chrome={chrome}>
        <ChromeNextGlobalHeader />
      </TestChromeProviders>
    );

    await userEvent.click(screen.getByTestId('chromeNextGlobalHeaderHelpButton'));

    expect(screen.getByTestId('helpMenuWhatsNewButton')).toBeInTheDocument();
  });

  it('renders a registered newsfeed handler before unread state emits', async () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getChromeStyle.mockReturnValue('project');
    chrome.getChromeStyle$.mockReturnValue(new BehaviorSubject('project'));
    Object.defineProperty(chrome.next, 'isEnabled', { configurable: true, get: () => true });
    chrome.getNewsfeedHandler$.mockReturnValue(
      new BehaviorSubject({
        open: jest.fn(),
        hasNew$: new Subject<boolean>(),
      })
    );

    renderWithI18n(
      <TestChromeProviders chrome={chrome}>
        <ChromeNextGlobalHeader />
      </TestChromeProviders>
    );

    await userEvent.click(screen.getByTestId('chromeNextGlobalHeaderHelpButton'));

    expect(screen.getByTestId('helpMenuWhatsNewButton')).toBeInTheDocument();
  });
});
