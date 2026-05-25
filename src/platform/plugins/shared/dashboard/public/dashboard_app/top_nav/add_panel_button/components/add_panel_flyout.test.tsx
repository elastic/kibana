/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AddPanelFlyout } from './add_panel_flyout';
import type { DashboardApi } from '../../../../dashboard_api/types';
import { EuiThemeProvider } from '@elastic/eui';

jest.mock('../use_menu_item_groups', () => ({}));

jest.mock('../../../../services/kibana_services', () => {
  return {
    embeddableService: {
      getAddFromLibraryContentComponent: jest
        .fn()
        .mockResolvedValue(() => <div data-test-subj="mockLibraryContent">Library content</div>),
    },
  };
});

const ContextWrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <IntlProvider locale="en">{children}</IntlProvider>
  </EuiThemeProvider>
);

const mockDashboardApi = {} as unknown as DashboardApi;

describe('AddPanelFlyout', () => {
  describe('tabs', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../use_menu_item_groups').useMenuItemGroups = () => ({});
    });

    test('renders "New" and "From library" tabs', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });
      await waitFor(async () => {
        expect(screen.getByTestId('addToDashboardFlyout-header')).toBeInTheDocument();
      });
      expect(screen.getByTestId('addToDashboardTab-new')).toBeInTheDocument();
      expect(screen.getByTestId('addToDashboardTab-library')).toBeInTheDocument();
    });

    test('defaults to "New" tab', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });

      await waitFor(async () => {
        expect(screen.getByTestId('addToDashboardTab-new')).toBeInTheDocument();
      });
      expect(screen.getByTestId('addToDashboardTab-new')).toHaveAttribute('aria-selected', 'true');
    });

    test('switches to "From library" tab on click', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });
      await waitFor(async () => {
        expect(screen.getByTestId('addToDashboardTab-library')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByTestId('addToDashboardTab-library'));
      await waitFor(() => {
        expect(screen.getByTestId('mockLibraryContent')).toBeInTheDocument();
      });
    });

    test('opens to "From library" tab when initialTab is "library"', async () => {
      render(
        <AddPanelFlyout
          dashboardApi={mockDashboardApi}
          ariaLabelledBy="addPanelFlyout"
          initialTab="library"
        />,
        {
          wrapper: ContextWrapper,
        }
      );

      await waitFor(() => {
        expect(screen.getByTestId('mockLibraryContent')).toBeInTheDocument();
      });
      expect(screen.getByTestId('addToDashboardTab-library')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('header', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../use_menu_item_groups').useMenuItemGroups = () => ({});
    });

    test('displays "Add to dashboard" heading', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });
      await waitFor(() => {
        expect(screen.getByText('Add to dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('displays errors', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../use_menu_item_groups').useMenuItemGroups = () => ({
        loading: false,
        error: new Error('simulated useMenuItemGroups error'),
      });
    });

    test('displays useMenuItemGroups error', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });

      await waitFor(() => {
        screen.getByTestId('dashboardPanelSelectionErrorIndicator');
      });
    });
  });

  describe('useMenuItemGroups returns results', () => {
    const onClickMock = jest.fn();
    // define this outside mock so that the reference doesn't change between renders
    const groups = [
      {
        id: 'panel1',
        title: 'App 1',
        items: [
          {
            icon: 'icon1',
            id: 'mockFactory',
            name: 'Factory 1',
            description: 'Factory 1 description',
            'data-test-subj': 'myItem',
            onClick: onClickMock,
            order: 0,
          },
        ],
        order: 10,
        'data-test-subj': 'dashboardEditorMenu-group1Group',
      },
    ];
    beforeEach(() => {
      onClickMock.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../use_menu_item_groups').useMenuItemGroups = () => ({
        groups,
        loading: false,
      });
    });

    test('calls item onClick handler when item is clicked', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });

      await waitFor(async () => {
        await userEvent.click(screen.getByTestId('myItem'));
        expect(onClickMock).toBeCalled();
      });
    });

    test('displays not found message when a user searches for an item that is not in the selection list', async () => {
      render(<AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />, {
        wrapper: ContextWrapper,
      });

      await waitFor(async () => {
        await userEvent.type(
          screen.getByTestId('dashboardPanelSelectionFlyout__searchInput'),
          'non existent panel'
        );
        screen.getByTestId('dashboardPanelSelectionNoPanelMessage');
      });
    });
  });
});
