/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContextSwitcher } from './context_switcher';
import type { ContextSwitcherProps, SpaceItem } from './types';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/test-env/test/rtl';

const buildSpaces = (): SpaceItem[] => [
  { id: 'default', name: 'Default', solution: 'Security', solutionIcon: 'logoSecurity' },
  {
    id: 'obs',
    name: 'Observability',
    solution: 'Observability',
    solutionIcon: 'logoObservability',
  },
  { id: 'marketing', name: 'Marketing' },
];

const buildEnvironmentContext = (
  overrides?: Partial<ContextSwitcherProps['environmentContext']>
) => ({
  name: 'My Awesome Project',
  environmentType: 'project' as const,
  submenuItems: [
    {
      id: 'manage',
      label: 'Manage project',
      'data-test-subj': 'contextSwitcherSubmenuItem-manage',
    },
  ],
  submenuFooterAction: {
    id: 'create-project',
    label: 'Create project',
    onClick: jest.fn(),
    'data-test-subj': 'contextSwitcherSubmenuFooterAction-createProject',
  },
  ...overrides,
});

const buildProps = (overrides?: Partial<ContextSwitcherProps>): ContextSwitcherProps => ({
  spaces: {
    active: buildSpaces()[0],
    items: buildSpaces(),
    onSelect: jest.fn(),
  },
  ...overrides,
});

describe('ContextSwitcher', () => {
  it('renders the trigger button with the active space name', () => {
    render(<ContextSwitcher {...buildProps()} />);
    expect(screen.getByTestId('contextSwitcherTriggerButton')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('opens the popover on trigger click and shows spaces', async () => {
    const user = userEvent.setup();

    render(<ContextSwitcher {...buildProps()} />);

    await user.click(screen.getByTestId('contextSwitcherTriggerButton'));
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('contextSwitcherPopover')).toBeInTheDocument();
    expect(screen.getByTestId('space-default')).toBeInTheDocument();
    expect(screen.getByTestId('space-obs')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSwitcherSpacesRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextSwitcherEnvironmentRow')).not.toBeInTheDocument();
  });

  it('calls onOpen when popover opens', async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();

    render(<ContextSwitcher {...buildProps({ onOpen })} />);

    await user.click(screen.getByTestId('contextSwitcherTriggerButton'));
    await waitForEuiPopoverOpen();

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls spaces.onSelect and closes popover when a space is selected', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const props = buildProps();
    props.spaces.onSelect = onSelect;

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    await user.click(trigger);
    await waitForEuiPopoverOpen();
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('space-obs'));
    expect(onSelect).toHaveBeenCalledWith('obs');
    await waitForEuiPopoverClose();
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
  });

  it('displays environment label when environmentContext is provided with single space', () => {
    const props = buildProps({ environmentContext: buildEnvironmentContext() });
    props.spaces.items = [buildSpaces()[0]];

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    expect(trigger).toHaveTextContent('My Awesome Project');
    expect(trigger).not.toHaveTextContent('Default');
  });

  it('displays combined label when environmentContext is provided with multiple spaces', () => {
    const props = buildProps({ environmentContext: buildEnvironmentContext() });

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    expect(trigger).toHaveTextContent('My Awesome Project: Default');
  });

  it('shows two-step navigation when environmentContext is present', async () => {
    const user = userEvent.setup();
    const props = buildProps({ environmentContext: buildEnvironmentContext() });

    render(<ContextSwitcher {...props} />);

    await user.click(screen.getByTestId('contextSwitcherTriggerButton'));
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('contextSwitcherEnvironmentRow')).toBeInTheDocument();
    expect(screen.getByTestId('contextSwitcherSpacesRow')).toBeInTheDocument();
    expect(screen.queryByTestId('space-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('space-obs')).not.toBeInTheDocument();
  });

  it('navigates to environment submenu and back to root', async () => {
    const user = userEvent.setup();
    const props = buildProps({ environmentContext: buildEnvironmentContext() });

    render(<ContextSwitcher {...props} />);

    await user.click(screen.getByTestId('contextSwitcherTriggerButton'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByTestId('contextSwitcherEnvironmentRow'));
    expect(screen.queryByTestId('contextSwitcherEnvironmentRow')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextSwitcherSubmenuBackButton')).toBeInTheDocument();

    // back to root view
    await user.click(screen.getByTestId('contextSwitcherSubmenuBackButton'));
    expect(screen.getByTestId('contextSwitcherEnvironmentRow')).toBeInTheDocument();
    expect(screen.getByTestId('contextSwitcherSpacesRow')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSwitcherSubmenuBackButton')).not.toBeInTheDocument();
  });

  it('closes the popover when clicking footer link or submenu footer action', async () => {
    const user = userEvent.setup();
    const onFooterLinkClick = jest.fn();
    const onSubmenuFooterActionClick = jest.fn();
    const env = buildEnvironmentContext();
    env.submenuFooterAction = { ...env.submenuFooterAction, onClick: onSubmenuFooterActionClick };
    const props = buildProps({
      footerLinks: [
        { id: 'connection-details', label: 'Connection details', onClick: onFooterLinkClick },
      ],
      environmentContext: env,
    });

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    await user.click(trigger);
    await waitForEuiPopoverOpen();
    expect(trigger).toHaveAttribute('aria-pressed', 'true');

    // close via footer link (root view)
    await user.click(screen.getByText('Connection details'));
    expect(onFooterLinkClick).toHaveBeenCalledTimes(1);
    await waitForEuiPopoverClose();
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
    await user.click(trigger);
    await waitForEuiPopoverOpen();

    // close via submenu footer action (environment submenu)
    await user.click(screen.getByTestId('contextSwitcherEnvironmentRow'));
    await user.click(screen.getByTestId('contextSwitcherSubmenuFooterAction-createProject'));
    expect(onSubmenuFooterActionClick).toHaveBeenCalledTimes(1);
    await waitForEuiPopoverClose();
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
  });
});
