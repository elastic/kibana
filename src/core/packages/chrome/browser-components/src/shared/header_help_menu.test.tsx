/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeHelpExtension } from '@kbn/core-chrome-browser';
import { HeaderHelpMenu } from './header_help_menu';
import { TestChromeProviders, serverlessCoreEnv } from '../test_helpers';

describe('HeaderHelpMenu', () => {
  afterEach(() => jest.clearAllMocks());

  const renderAndOpenMenu = async ({
    chrome,
    coreEnv,
  }: {
    chrome?: ReturnType<typeof chromeServiceMock.createStartContract>;
    coreEnv?: typeof serverlessCoreEnv;
  } = {}) => {
    renderWithI18n(
      <TestChromeProviders chrome={chrome} coreEnv={coreEnv}>
        <HeaderHelpMenu />
      </TestChromeProviders>
    );
    await userEvent.click(screen.getByRole('button'));
  };

  it('should only render the default content', async () => {
    await renderAndOpenMenu();

    expect(screen.getByText('Kibana documentation')).toBeInTheDocument();
    expect(screen.getByText('Ask Elastic')).toBeInTheDocument();
    expect(screen.getByText('Open an issue in GitHub')).toBeInTheDocument();
  });

  it('should not render the version details when serverless', () => {
    renderWithI18n(
      <TestChromeProviders coreEnv={serverlessCoreEnv}>
        <HeaderHelpMenu />
      </TestChromeProviders>
    );
    expect(screen.queryByTestId('kbnVersionString')).not.toBeInTheDocument();
  });

  it('should render custom link with onClick and closes menu', async () => {
    const onClick = jest.fn();
    const chrome = chromeServiceMock.createStartContract();
    chrome.getHelpExtension$.mockReturnValue(
      new BehaviorSubject<ChromeHelpExtension | undefined>({
        appName: 'Test App',
        links: [
          {
            linkType: 'custom',
            content: 'Keyboard shortcuts',
            iconType: 'keyboard',
            onClick,
          },
        ],
      })
    );

    await renderAndOpenMenu({ chrome });

    const customItem = screen.getByText('Keyboard shortcuts').closest('button')!;
    expect(customItem).toBeInTheDocument();
    await userEvent.click(customItem, { pointerEventsCheck: 0 });
    expect(onClick).toHaveBeenCalled();
  });

  it('should render the global custom content + the default content', async () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getGlobalHelpExtensionMenuLinks$.mockReturnValue(
      new BehaviorSubject([
        {
          linkType: 'custom' as const,
          href: 'my-link-2',
          content: 'Some other text for the link',
          priority: 10,
        },
        {
          linkType: 'custom' as const,
          href: 'my-link',
          content: 'Some text for the link',
          'data-test-subj': 'my-test-custom-link',
          priority: 100,
        },
      ])
    );

    await renderAndOpenMenu({ chrome });

    expect(screen.getByText('Some text for the link')).toBeInTheDocument();
    expect(screen.getByText('Some other text for the link')).toBeInTheDocument();
    expect(screen.getByText('Kibana documentation')).toBeInTheDocument();

    expect(screen.getByTestId('my-test-custom-link')).toBeInTheDocument();

    // The custom link with highest priority should appear
    expect(screen.getByText('Some text for the link')).toBeInTheDocument();
  });

  it('should render extension section with app name title', async () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getHelpExtension$.mockReturnValue(
      new BehaviorSubject<ChromeHelpExtension | undefined>({
        appName: 'Security',
        links: [
          {
            linkType: 'documentation',
            href: 'https://example.com/docs',
          },
        ],
      })
    );

    await renderAndOpenMenu({ chrome });

    // App name rendered as section title
    expect(screen.getByText('Security')).toBeInTheDocument();

    // Documentation link rendered
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });
});
