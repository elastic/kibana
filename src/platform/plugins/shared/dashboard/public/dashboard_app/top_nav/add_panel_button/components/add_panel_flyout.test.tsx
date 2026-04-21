/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ACTION_CREATE_TIME_SLIDER, TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { AddPanelFlyout } from './add_panel_flyout';
import type { DashboardApi } from '../../../../dashboard_api/types';

jest.mock('../get_menu_item_groups', () => ({}));

jest.mock('../../../../services/kibana_services', () => {
  const ReactActual = jest.requireActual('react');
  return {
    embeddableService: {
      getAddFromLibraryContentComponent: jest
        .fn()
        .mockResolvedValue(() =>
          ReactActual.createElement(
            'div',
            { 'data-test-subj': 'mockLibraryContent' },
            'Library content'
          )
        ),
    },
  };
});

const mockDashboardApi = {} as unknown as DashboardApi;

describe('AddPanelFlyout', () => {
  describe('tabs', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../get_menu_item_groups').getMenuItemGroups = async () => [];
    });

    test('renders "New" and "From library" tabs', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      expect(screen.getByTestId('addToDashboardTab-new')).toBeInTheDocument();
      expect(screen.getByTestId('addToDashboardTab-library')).toBeInTheDocument();
    });

    test('defaults to "New" tab', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      const newTab = screen.getByTestId('addToDashboardTab-new');
      expect(newTab).toHaveAttribute('aria-selected', 'true');
    });

    test('switches to "From library" tab on click', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      await userEvent.click(screen.getByTestId('addToDashboardTab-library'));

      await waitFor(() => {
        expect(screen.getByTestId('mockLibraryContent')).toBeInTheDocument();
      });
    });

    test('opens to "From library" tab when initialTab is "library"', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout
            dashboardApi={mockDashboardApi}
            ariaLabelledBy="addPanelFlyout"
            initialTab="library"
          />
        </IntlProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mockLibraryContent')).toBeInTheDocument();
      });

      const libraryTab = screen.getByTestId('addToDashboardTab-library');
      expect(libraryTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('header', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../get_menu_item_groups').getMenuItemGroups = async () => [];
    });

    test('displays "Add to dashboard" heading', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      expect(screen.getByText('Add to dashboard')).toBeInTheDocument();
    });
  });

  describe('getMenuItemGroups throws', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../get_menu_item_groups').getMenuItemGroups = async () => {
        throw new Error('simulated getMenuItemGroups error');
      };
    });

    test('displays getMenuItemGroups error', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      await waitFor(() => {
        screen.getByTestId('dashboardPanelSelectionErrorIndicator');
      });
    });
  });

  describe('getMenuItemGroups returns results', () => {
    const onClickMock = jest.fn();
    beforeEach(() => {
      onClickMock.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../get_menu_item_groups').getMenuItemGroups = async () => [
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
    });

    test('calls item onClick handler when item is clicked', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      await waitFor(async () => {
        await userEvent.click(screen.getByTestId('myItem'));
        expect(onClickMock).toBeCalled();
      });
    });

    test('displays not found message when a user searches for an item that is not in the selection list', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={mockDashboardApi} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      await waitFor(async () => {
        await userEvent.type(
          screen.getByTestId('dashboardPanelSelectionFlyout__searchInput'),
          'non existent panel'
        );
        screen.getByTestId('dashboardPanelSelectionNoPanelMessage');
      });
    });
  });

  describe('time slider disabled state reacts to layout$', () => {
    const layout$ = new BehaviorSubject<{ pinnedPanels: Record<string, { type: string }> }>({
      pinnedPanels: { pinned1: { type: TIME_SLIDER_CONTROL } },
    });

    const dashboardApiWithLayout = { layout$ } as unknown as DashboardApi;

    beforeEach(() => {
      layout$.next({
        pinnedPanels: { pinned1: { type: TIME_SLIDER_CONTROL } },
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../get_menu_item_groups').getMenuItemGroups = async () => [
        {
          id: 'controlsGroup',
          title: 'Controls',
          items: [
            {
              icon: 'controls',
              id: ACTION_CREATE_TIME_SLIDER,
              name: 'Time slider',
              'data-test-subj': 'create-action-Time slider',
              onClick: jest.fn(),
              order: 0,
            },
          ],
          order: 10,
          'data-test-subj': 'dashboardEditorMenu-controlsGroupGroup',
        },
      ];
    });

    test('re-enables time slider when pinned time slider is removed while flyout is open', async () => {
      render(
        <IntlProvider locale="en">
          <AddPanelFlyout dashboardApi={dashboardApiWithLayout} ariaLabelledBy="addPanelFlyout" />
        </IntlProvider>
      );

      await screen.findByTestId('create-action-Time slider');

      await waitFor(() => {
        expect(screen.getByTestId('create-action-Time slider')).toBeDisabled();
      });

      await act(async () => {
        layout$.next({ pinnedPanels: {} });
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-action-Time slider')).not.toBeDisabled();
      });
    });
  });
});
