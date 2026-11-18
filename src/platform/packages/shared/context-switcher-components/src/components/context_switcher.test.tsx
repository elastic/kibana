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
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

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
    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-space-name', 'Default');
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
    expect(onSelect).toHaveBeenCalledWith('obs', expect.any(Object));
    await waitForEuiPopoverClose();
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps popover open for cmd/ctrl click', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const props = buildProps();
    props.spaces.onSelect = onSelect;

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    await user.click(trigger);
    await waitForEuiPopoverOpen();

    await user.keyboard('{Meta>}');
    await user.click(screen.getByTestId('space-obs'));
    await user.keyboard('{/Meta}');

    expect(onSelect).toHaveBeenCalledWith('obs', expect.objectContaining({ metaKey: true }));
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps popover open for shift click', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const props = buildProps();
    props.spaces.onSelect = onSelect;

    render(<ContextSwitcher {...props} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    await user.click(trigger);
    await waitForEuiPopoverOpen();

    await user.keyboard('{Shift>}');
    await user.click(screen.getByTestId('space-obs'));
    await user.keyboard('{/Shift}');

    expect(onSelect).toHaveBeenCalledWith('obs', expect.objectContaining({ shiftKey: true }));
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens directly onto the space list', async () => {
    const user = userEvent.setup();

    render(<ContextSwitcher {...buildProps()} />);

    const trigger = screen.getByTestId('contextSwitcherTriggerButton');
    expect(trigger).toHaveTextContent('Default');
    await user.click(trigger);
    await waitForEuiPopoverOpen();
    expect(screen.queryByTestId('contextSwitcherSpacesSearchInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('space-default')).toBeInTheDocument();
    expect(screen.queryByText('My spaces')).not.toBeInTheDocument();
  });

  it('shows Manage spaces above Create space', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    props.spaces.headerAction = { id: 'manage', label: 'Manage spaces', onClick: jest.fn() };
    props.spaces.footerAction = { id: 'create', label: 'Create space', onClick: jest.fn() };

    render(<ContextSwitcher {...props} />);

    await user.click(screen.getByTestId('contextSwitcherTriggerButton'));
    await waitForEuiPopoverOpen();
    const manage = screen.getByText('Manage spaces');
    const create = screen.getByText('Create space');
    expect(manage.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
