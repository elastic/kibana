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
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/ui-app-menu';
import type { AppHeaderMetadataItems } from './types';
import { AppHeaderView } from './app_header';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

describe('AppHeaderView', () => {
  it('renders an explicit share action in the title row only', () => {
    const onClick = jest.fn();

    render(
      <AppHeaderView
        title="Dashboard"
        share={{
          onClick,
          tooltip: { content: 'Share this dashboard', title: 'Share' },
        }}
        menu={{
          items: [
            {
              id: 'settings',
              order: 1,
              label: 'Settings',
              iconType: 'gear',
              run: jest.fn(),
            },
          ],
        }}
      />
    );

    const titleShare = screen.getByTestId(
      `${APP_HEADER_TEST_SUBJECTS.sharePrefix} ${APP_HEADER_TEST_SUBJECTS.shareButton}`
    );
    fireEvent.click(titleShare);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(typeof onClick.mock.calls[0][0].returnFocus).toBe('function');
    expect(onClick.mock.calls[0][0].triggerElement).toBeUndefined();
  });

  it('does not derive a title share action from a menu share item', async () => {
    const runShare = jest.fn();

    render(
      <AppHeaderView
        title="Dashboard"
        menu={{
          items: [
            {
              id: 'share',
              order: 0,
              label: 'Share',
              iconType: 'share',
              testId: 'menuShare',
              run: runShare,
            },
          ],
        }}
      />
    );

    expect(
      screen.queryByTestId(
        `${APP_HEADER_TEST_SUBJECTS.sharePrefix} ${APP_HEADER_TEST_SUBJECTS.shareButton}`
      )
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.overflowButton));
    expect(await screen.findByTestId('menuShare')).toBeInTheDocument();
  });

  it('keeps an app-owned menu share item alongside an explicit title share action', async () => {
    const explicitOnClick = jest.fn();
    const menuRun = jest.fn();

    render(
      <AppHeaderView
        title="Dashboard"
        share={{ onClick: explicitOnClick }}
        menu={{
          items: [
            {
              id: 'share',
              order: 0,
              label: 'Share',
              iconType: 'share',
              testId: 'menuShare',
              run: menuRun,
            },
          ],
        }}
      />
    );

    fireEvent.click(
      screen.getByTestId(
        `${APP_HEADER_TEST_SUBJECTS.sharePrefix} ${APP_HEADER_TEST_SUBJECTS.shareButton}`
      )
    );
    expect(explicitOnClick).toHaveBeenCalledTimes(1);
    expect(menuRun).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.overflowButton));
    expect(await screen.findByTestId('menuShare')).toBeInTheDocument();
  });

  it('renders when the only content is a favorite action', () => {
    const onToggle = jest.fn();
    render(
      <AppHeaderView
        favorite={{
          status: 'unfavorited',
          onToggle,
        }}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.favorite)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Starred' })).toBeInTheDocument();
  });

  it('renders a favorited state with custom labels and calls onToggle', () => {
    const onToggle = jest.fn();
    render(
      <AppHeaderView
        favorite={{
          status: 'favorited',
          onToggle,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Remove from Starred' });
    expect(button).toHaveAttribute(
      'data-test-subj',
      `${APP_HEADER_TEST_SUBJECTS.favoriteButton} unfavoriteButton`
    );
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('disables the favorite button when isDisabled is set', () => {
    render(
      <AppHeaderView
        favorite={{
          status: 'unfavorited',
          onToggle: jest.fn(),
          isDisabled: true,
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Add to Starred' })).toBeDisabled();
  });

  it('renders a description with a Learn more link', () => {
    render(
      <AppHeaderView
        title="Data federation"
        description={{
          text: 'Query across clusters.',
          learnMoreUrl: 'https://example.com/docs',
        }}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Query across clusters. Learn more'
    );
    expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
      'href',
      'https://example.com/docs'
    );
  });

  it('renders metadata items as a wrapping row', () => {
    const onInspect = jest.fn();

    render(
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

  it('does not render a React node passed as a metadata label', () => {
    render(
      <AppHeaderView
        metadata={
          [
            {
              type: 'text',
              label: <span data-test-subj="hacked-metadata-label">hack</span>,
            },
            { type: 'text', label: 'Created by' },
          ] as unknown as AppHeaderMetadataItems
        }
      />
    );

    expect(screen.queryByTestId('hacked-metadata-label')).not.toBeInTheDocument();
    expect(screen.getByText('Created by')).toBeInTheDocument();
  });

  it('limits metadata rendering to three items', () => {
    const metadata = [
      { type: 'text', label: 'First' },
      { type: 'text', label: 'Second' },
      { type: 'text', label: 'Third' },
    ] satisfies AppHeaderMetadataItems;
    metadata.push({ type: 'text', label: 'Fourth' });

    render(<AppHeaderView metadata={metadata} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.queryByText('Fourth')).not.toBeInTheDocument();
  });

  it('renders when the only content is a static app menu item', async () => {
    render(
      <AppHeaderView
        staticItems={[
          {
            id: 'addIntegrations',
            label: 'Add integrations',
            iconType: 'indexOpen',
            href: '/app/integrations/browse',
            testId: APP_HEADER_TEST_SUBJECTS.menuAddIntegrations,
          },
        ]}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.root)).toBeInTheDocument();
  });

  it('prefers a structured menu over the fallback menu node', async () => {
    render(
      <AppHeaderView
        title="Dashboard"
        menu={{
          items: [
            {
              id: 'settings',
              order: 1,
              label: 'Settings',
              iconType: 'gear',
              testId: 'settingsMenu',
              run: jest.fn(),
            },
          ],
        }}
        fallbackMenu={<div data-test-subj="legacyMenu">Legacy</div>}
      />
    );

    fireEvent.click(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.overflowButton));
    expect(await screen.findByTestId('settingsMenu')).toBeInTheDocument();
    expect(screen.queryByTestId('legacyMenu')).not.toBeInTheDocument();
  });

  it('renders the fallback menu when no structured menu is provided', () => {
    render(<AppHeaderView fallbackMenu={<div data-test-subj="legacyMenu">Legacy</div>} />);

    expect(screen.getByTestId('legacyMenu')).toBeInTheDocument();
  });

  it('renders Discover tabs beside the title', () => {
    render(
      <AppHeaderView title="Discover" titleAppend={<div data-test-subj="tabsBar">Tabs</div>} />
    );

    expect(screen.getByTestId('tabsBar')).toBeInTheDocument();
  });

  it('renders an s title for standard spacing and an xs title for compact spacing', () => {
    const { unmount: unmountStandard } = render(<AppHeaderView title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/euiTitle-s/);
    unmountStandard();

    render(<AppHeaderView title="Dashboard" spacing="compact" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/euiTitle-xs/);
  });

  it('renders tab badge and test subject metadata', () => {
    render(
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

    render(
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
    render(
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

  it('uses back hrefs as final targets without rewriting them', () => {
    render(<AppHeaderView back="/base-other/app" />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/base-other/app'
    );
  });

  it('renders multiple back targets as a menu and closes it after selection', async () => {
    const backClick = jest.fn((event: React.MouseEvent) => event.preventDefault());

    render(
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

      render(<AppHeaderView title="Dashboard" sticky={sticky} />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    });

    it('treats explicit standard spacing like the default', () => {
      const { result } = renderHook(() => useEuiTheme());

      render(<AppHeaderView title="Dashboard" sticky={false} spacing="standard" />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    });

    it('supports compact and flush spacing', () => {
      const { result } = renderHook(() => useEuiTheme());
      const { rerender } = render(
        <AppHeaderView title="Dashboard" sticky={false} spacing="compact" />
      );

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size.s);

      rerender(<AppHeaderView title="Dashboard" sticky={false} spacing="flush" />);
      expect(root).not.toHaveStyleRule('padding-inline', expect.any(String));
    });

    it.each([
      ['bleed', 'base'],
      ['largeBleed', 'l'],
    ] as const)('uses the matching gutter for %s spacing', (spacing, size) => {
      const { result } = renderHook(() => useEuiTheme());

      render(<AppHeaderView title="Dashboard" sticky={false} spacing={spacing} />);

      const root = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
      expect(root).toHaveStyleRule('padding-inline', result.current.euiTheme.size[size]);
      expect(root).toHaveStyleRule('margin-top', `-${result.current.euiTheme.size[size]}`);
      expect(root).toHaveStyleRule('margin-inline', `-${result.current.euiTheme.size[size]}`);
    });

    it('applies symmetric vertical padding matching the horizontal inset', () => {
      const { result } = renderHook(() => useEuiTheme());

      render(<AppHeaderView title="Dashboard" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('box-sizing', 'border-box');
      expect(primaryRow).toHaveStyleRule('min-height', '64px');
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.base);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.base);
    });

    it('matches vertical padding to the horizontal inset for compact', () => {
      const { result } = renderHook(() => useEuiTheme());

      render(<AppHeaderView title="Dashboard" sticky={false} spacing="compact" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.s);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.s);
      expect(primaryRow).toHaveStyleRule('min-height', '48px');
    });

    it('keeps standard vertical padding for flush', () => {
      const { result } = renderHook(() => useEuiTheme());

      render(<AppHeaderView title="Dashboard" sticky={false} spacing="flush" />);

      const primaryRow = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)
        .firstElementChild as HTMLElement;
      expect(primaryRow).toHaveStyleRule('padding-block-start', result.current.euiTheme.size.base);
      expect(primaryRow).toHaveStyleRule('padding-block-end', result.current.euiTheme.size.base);
    });
  });

  describe('bottom border', () => {
    it('renders a bottom border by default', () => {
      render(<AppHeaderView title="Dashboard" />);

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toHaveStyleRule(
        'border-bottom',
        expect.stringMatching(/solid/)
      );
    });

    it('omits the bottom border for Discover tabs', () => {
      render(<AppHeaderView title="Discover" titleAppend={<div>Tabs</div>} borderless />);

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).not.toHaveStyleRule(
        'border-bottom',
        expect.stringMatching(/solid/)
      );
    });
  });
});
