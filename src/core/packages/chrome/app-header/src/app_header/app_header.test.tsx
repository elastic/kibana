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
import '@emotion/jest';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeBadge } from '@kbn/core-chrome-browser';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderMetadataItems } from '../types';
import { AppHeaderView, DiscoverAppHeader } from './app_header';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

const renderAppHeader = (
  ui: React.ReactElement,
  chrome: InternalChromeStart = chromeServiceMock.createStartContract()
) => {
  return render(<ChromeServiceProvider value={{ chrome }}>{ui}</ChromeServiceProvider>);
};

describe('AppHeaderView', () => {
  it('renders app menu share as a title action while keeping it in the menu', async () => {
    const runShare = jest.fn();

    renderAppHeader(
      <AppHeaderView
        menu={{
          items: [
            {
              id: 'share',
              order: 0,
              label: 'Share',
              iconType: 'share',
              testId: 'shareTopNavButton',
              run: runShare,
            },
          ],
        }}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();

    // The title-row share button is derived from the menu item.
    fireEvent.click(
      screen.getByTestId(`${APP_HEADER_TEST_SUBJECTS.sharePrefix} shareTopNavButton`)
    );
    expect(runShare).toHaveBeenCalledTimes(1);

    // The share item is no longer removed from the trailing app menu; open the overflow to find it.
    fireEvent.click(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.overflowButton));
    expect(await screen.findByTestId('shareTopNavButton')).toBeInTheDocument();
  });

  it('renders when the only content is a favorite action', () => {
    renderAppHeader(
      <AppHeaderView
        favorite={
          <EuiToolTip content="Favorite" disableScreenReaderOutput>
            <EuiButtonIcon aria-label="Favorite" iconType="starEmpty" onClick={jest.fn()} />
          </EuiToolTip>
        }
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument();
  });

  it('renders metadata items as a wrapping row', () => {
    const onInspect = jest.fn();

    renderAppHeader(
      <AppHeaderView
        metadata={[
          { type: 'health', label: 'Warning at llm 24', color: 'warning' },
          {
            type: 'text',
            label: 'Created by',
            value: 'elastic',
            'data-test-subj': 'createdByMetadata',
          },
          { type: 'button', label: 'Updated by: analyst', onClick: onInspect },
        ]}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.metadata)).toBeInTheDocument();
    expect(screen.getByText('Warning at llm 24')).toBeInTheDocument();
    expect(screen.getByTestId('createdByMetadata')).toHaveTextContent('Created by elastic');

    fireEvent.click(screen.getByRole('button', { name: 'Updated by: analyst' }));

    expect(onInspect).toHaveBeenCalledTimes(1);
  });

  it('limits metadata rendering to three items', () => {
    const metadata = [
      { type: 'text', label: 'First' },
      { type: 'text', label: 'Second' },
      { type: 'text', label: 'Third' },
    ] satisfies AppHeaderMetadataItems;
    metadata.push({ type: 'text', label: 'Fourth' });

    renderAppHeader(<AppHeaderView metadata={metadata} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.queryByText('Fourth')).not.toBeInTheDocument();
  });

  it('renders when the only content is a static app menu item', async () => {
    renderAppHeader(<AppHeaderView showAddIntegrations />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.root)).toBeInTheDocument();
  });

  it('renders Discover tabs beside the title', () => {
    renderAppHeader(
      <DiscoverAppHeader title="Discover" tabsBar={<div data-test-subj="tabsBar">Tabs</div>} />
    );

    expect(screen.getByTestId('tabsBar')).toBeInTheDocument();
  });

  it('renders legacy badge fallback content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getBadge$.mockReturnValue(
      new BehaviorSubject<ChromeBadge>({ text: 'Technical preview', tooltip: '' })
    );

    renderAppHeader(<AppHeaderView />, chrome);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByText('Technical preview')).toBeInTheDocument();
  });

  it('renders an s title for standard spacing and an xs title for compact spacing', () => {
    const { unmount: unmountStandard } = renderAppHeader(<AppHeaderView title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/euiTitle-s/);
    unmountStandard();

    renderAppHeader(<AppHeaderView title="Dashboard" spacing="compact" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/euiTitle-xs/);
  });

  it('renders tab badge and test subject metadata', () => {
    renderAppHeader(
      <AppHeaderView
        tabs={[
          {
            id: 'alerts',
            label: 'Alerts',
            badge: 3,
            'data-test-subj': 'alertsTab',
          },
        ]}
      />
    );

    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders tab actions in an ellipsis popover without triggering tab navigation', () => {
    const onTabClick = jest.fn();
    const onCopy = jest.fn();

    renderAppHeader(
      <AppHeaderView
        tabs={[
          {
            id: 'lifecycle',
            label: 'Data lifecycle',
            'data-test-subj': 'lifecycleTab',
            isSelected: true,
            onClick: onTabClick,
            actions: {
              ariaLabel: 'Data lifecycle tab actions',
              'data-test-subj': 'lifecycleTabActionsButton',
              items: [
                {
                  id: 'copy',
                  label: 'Copy API request',
                  iconType: 'copy',
                  onClick: onCopy,
                  'data-test-subj': 'lifecycleTabCopy',
                },
              ],
            },
          },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId('lifecycleTabActionsButton'));
    expect(onTabClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('lifecycleTabCopy'));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onTabClick).not.toHaveBeenCalled();
  });

  it('only renders tab actions for the selected tab', () => {
    renderAppHeader(
      <AppHeaderView
        tabs={[
          {
            id: 'lifecycle',
            label: 'Data lifecycle',
            isSelected: false,
            actions: {
              ariaLabel: 'More actions',
              'data-test-subj': 'lifecycleTabActionsButton',
              items: [{ id: 'copy', label: 'Copy API request', onClick: jest.fn() }],
            },
          },
        ]}
      />
    );

    expect(screen.queryByTestId('lifecycleTabActionsButton')).not.toBeInTheDocument();
  });

  it('only treats exact base path prefixes as already prepended for back links', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.componentDeps.basePath.get.mockReturnValue('/base');
    chrome.componentDeps.basePath.prepend.mockImplementation((path: string) => `/base${path}`);

    renderAppHeader(<AppHeaderView back="/base-other/app" />, chrome);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/base/base-other/app'
    );
  });

  it('renders multiple back targets as a menu and closes it after selection', async () => {
    const backClick = jest.fn((event: React.MouseEvent) => event.preventDefault());

    renderAppHeader(
      <AppHeaderView
        back={[
          { href: '/app/first', label: 'First app' },
          { href: '/app/second', label: 'Second app', onClick: backClick },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open back navigation menu' }));
    fireEvent.click(screen.getByText('Second app'));

    expect(backClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Second app')).not.toBeInTheDocument());
  });

  describe('spacing', () => {
    it.each([true, false])('uses the standard gutter when sticky is %s', (sticky) => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" sticky={sticky} />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    });

    it('treats explicit standard spacing like the default', () => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" sticky={false} spacing="standard" />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    });

    it('supports compact and flush spacing', () => {
      const { result } = renderHook(() => useEuiTheme());
      const { rerender } = renderAppHeader(
        <AppHeaderView title="Dashboard" sticky={false} spacing="compact" />
      );

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.s);

      rerender(
        <ChromeServiceProvider value={{ chrome: chromeServiceMock.createStartContract() }}>
          <AppHeaderView title="Dashboard" sticky={false} spacing="flush" />
        </ChromeServiceProvider>
      );
      expect(root).not.toHaveStyleRule('padding-inline', expect.any(String));
    });

    it.each([
      ['bleed', 'base'],
      ['largeBleed', 'l'],
    ] as const)('uses the matching gutter for %s spacing', (spacing, size) => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" sticky={false} spacing={spacing} />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size[size]);
      expect(root).toHaveStyleRule('margin-top', `-${result.current.euiTheme.size[size]}`);
      expect(root).toHaveStyleRule('margin-inline', `-${result.current.euiTheme.size[size]}`);
    });

    it('applies symmetric vertical padding matching the horizontal inset', () => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('box-sizing', 'border-box');
      expect(primaryRow).toHaveStyleRule('min-height', '64px');
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.base);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.base);
    });

    it('matches vertical padding to the horizontal inset for compact', () => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" sticky={false} spacing="compact" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.s);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.s);
      expect(primaryRow).toHaveStyleRule('min-height', '48px');
    });

    it('keeps standard vertical padding for flush', () => {
      const { result } = renderHook(() => useEuiTheme());

      renderAppHeader(<AppHeaderView title="Dashboard" sticky={false} spacing="flush" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.base);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.base);
    });
  });

  describe('borderless flag', () => {
    it('renders a bottom border by default', () => {
      renderAppHeader(<AppHeaderView title="Dashboard" />);

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toHaveStyleRule(
        'border-bottom',
        expect.stringMatching(/solid/)
      );
    });

    it('omits the bottom border when borderless is set', () => {
      renderAppHeader(<AppHeaderView title="Dashboard" borderless />);

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).not.toHaveStyleRule(
        'border-bottom',
        expect.stringMatching(/solid/)
      );
    });
  });
});
