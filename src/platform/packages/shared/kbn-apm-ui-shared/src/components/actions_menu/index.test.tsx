/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { ActionsMenu } from '.';
import type { ActionGroups } from './types';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
  useGeneratedHtmlId: jest.fn(),
}));

const mockActions: ActionGroups = [
  {
    id: 'discover',
    actions: [
      {
        id: 'openInDiscover',
        name: 'Open in Discover',
        icon: 'discoverApp',
        onClick: jest.fn(),
        ebt: { action: 'openInDiscover', element: 'menu' },
      },
    ],
  },
  {
    id: 'alerts',
    groupLabel: 'Alerts',
    actions: [
      {
        id: 'createThresholdRule',
        name: 'Create threshold rule',
        icon: 'bell',
        ebt: { action: 'createThresholdRule', element: 'menu' },
        items: [
          {
            id: 'createLatencyRule',
            name: 'Latency',
            onClick: jest.fn(),
            ebt: { action: 'createLatencyRule', element: 'menu' },
          },
        ],
      },
      {
        id: 'createAnomalyRule',
        name: 'Create anomaly rule',
        onClick: jest.fn(),
        ebt: { action: 'createAnomalyRule', element: 'menu' },
      },
    ],
  },
];

describe('ActionsMenu', () => {
  beforeEach(() => {
    (useEuiTheme as jest.Mock).mockReturnValue({
      euiTheme: {
        colors: { textParagraph: '#333' },
        border: { thin: '1px solid #eee' },
        size: { m: '16px' },
      },
    });
    (useGeneratedHtmlId as jest.Mock).mockReturnValue('test-menu-id');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderMenu = (props: Partial<React.ComponentProps<typeof ActionsMenu>> = {}) =>
    render(<ActionsMenu actions={mockActions} dataTestSubjPrefix="testMenu" {...props} />);

  const getTrigger = () => screen.getByRole('button', { name: 'Actions' });

  it('renders the trigger button', () => {
    renderMenu();
    expect(getTrigger()).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', () => {
    renderMenu();
    expect(screen.queryByTestId('testMenuGroup-alerts')).not.toBeInTheDocument();

    fireEvent.click(getTrigger());

    expect(screen.getByTestId('testMenuGroup-alerts')).toBeInTheDocument();
  });

  it('renders action groups with correct test subjects', () => {
    renderMenu();
    fireEvent.click(getTrigger());

    expect(screen.getByTestId('testMenuGroup-alerts')).toBeInTheDocument();
  });

  it('renders action items with correct test subjects', () => {
    renderMenu();
    fireEvent.click(getTrigger());

    expect(screen.getByTestId('testMenuItem-openInDiscover')).toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-createThresholdRule')).toBeInTheDocument();
    expect(screen.getByTestId('testMenuItem-createAnomalyRule')).toBeInTheDocument();
  });

  it('calls onClick and closes the popover when a direct action is clicked', async () => {
    const onClick = jest.fn();
    const actions: ActionGroups = [
      {
        id: 'g1',
        actions: [{ id: 'action1', name: 'Action 1', onClick, ebt: { action: 'a', element: 'e' } }],
      },
    ];
    renderMenu({ actions, dataTestSubjPrefix: 'menu' });
    fireEvent.click(getTrigger());

    fireEvent.click(screen.getByTestId('menuItem-action1'));

    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('menuItem-action1')).not.toBeInTheDocument();
    });
  });

  it('navigates to the sub-panel when a parent action is clicked', async () => {
    renderMenu();
    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByTestId('testMenuItem-createThresholdRule'));

    await waitFor(() => {
      expect(screen.getByTestId('testMenuItem-createLatencyRule')).toBeInTheDocument();
    });
  });

  it('calls sub-item onClick and closes the popover when a sub-item is clicked', async () => {
    const subItemClick = jest.fn();
    const actions: ActionGroups = [
      {
        id: 'g1',
        actions: [
          {
            id: 'parent',
            name: 'Parent',
            ebt: { action: 'a', element: 'e' },
            items: [
              {
                id: 'child',
                name: 'Child',
                onClick: subItemClick,
                ebt: { action: 'b', element: 'e' },
              },
            ],
          },
        ],
      },
    ];
    renderMenu({ actions, dataTestSubjPrefix: 'menu' });
    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByTestId('menuItem-parent'));

    await waitFor(() => {
      expect(screen.getByTestId('menuItem-child')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('menuItem-child'));

    expect(subItemClick).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('menuItem-child')).not.toBeInTheDocument();
    });
  });

  it('does not render actions column when actions are empty', () => {
    renderMenu({ actions: [] });
    fireEvent.click(getTrigger());

    expect(screen.queryByTestId('testMenuItem-openInDiscover')).not.toBeInTheDocument();
  });
});
