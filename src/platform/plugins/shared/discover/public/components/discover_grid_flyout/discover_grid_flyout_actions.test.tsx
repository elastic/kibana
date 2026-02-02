/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DiscoverGridFlyoutActions } from './discover_grid_flyout_actions';
import React from 'react';
import userEvent from '@testing-library/user-event';
import type { FlyoutActionItem } from './types';

let mockBreakpointSize: string | undefined;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: jest.fn((breakpoints: string[]) => {
      if (mockBreakpointSize && breakpoints.includes(mockBreakpointSize)) {
        return true;
      }

      return original.useIsWithinBreakpoints(breakpoints);
    }),
    useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
  };
});

const setup = ({
  breakpointSize,
  flyoutActions,
}: {
  breakpointSize?: string;
  flyoutActions: FlyoutActionItem[];
}) => {
  mockBreakpointSize = breakpointSize;
  renderWithI18n(<DiscoverGridFlyoutActions flyoutActions={flyoutActions} />);
  return { user: userEvent.setup() };
};

const generateFlyoutActions = (count: number): FlyoutActionItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `action-item-${i}`,
    enabled: true,
    label: `Action ${i}`,
    iconType: 'document',
    dataTestSubj: `customActionItem${i}`,
    onClick: jest.fn(),
  }));

describe('DiscoverGridFlyoutActions', () => {
  beforeEach(() => {
    mockBreakpointSize = undefined;
  });

  it('should display full size action buttons', async () => {
    setup({ flyoutActions: generateFlyoutActions(3) });

    expect(screen.getByText('Action 0')).toBeInTheDocument();
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('should display icon action buttons and overflow menu', async () => {
    const { user } = setup({ flyoutActions: generateFlyoutActions(4) });

    expect(screen.queryByText('Action 0')).not.toBeInTheDocument();
    expect(screen.getByTestId('customActionItem0')).toBeInTheDocument();
    expect(screen.queryByText('Action 1')).not.toBeInTheDocument();
    expect(screen.getByTestId('customActionItem1')).toBeInTheDocument();
    expect(screen.queryByText('Action 2')).not.toBeInTheDocument();
    expect(screen.getByTestId('customActionItem2')).toBeInTheDocument();
    expect(screen.queryByText('Action 3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customActionItem3')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('docViewerMoreFlyoutActionsButton'));

    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });

  it('should display only a menu in mobile view', async () => {
    const { user } = setup({ breakpointSize: 's', flyoutActions: generateFlyoutActions(3) });

    expect(screen.queryByText('Action 0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customActionItem0')).not.toBeInTheDocument();
    expect(screen.queryByText('Action 1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customActionItem1')).not.toBeInTheDocument();
    expect(screen.queryByText('Action 2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customActionItem2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('docViewerMobileActionsButton'));

    expect(screen.getByText('Action 0')).toBeInTheDocument();
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });
});
