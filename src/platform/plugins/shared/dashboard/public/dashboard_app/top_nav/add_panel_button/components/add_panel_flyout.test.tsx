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
import { DashboardApi } from '../../../../dashboard_api/types';

jest.mock('../get_menu_item_groups', () => ({}));

const mockDashboardApi = {} as unknown as DashboardApi;

describe('AddPanelFlyout', () => {
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
          <AddPanelFlyout dashboardApi={mockDashboardApi} />
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
          <AddPanelFlyout dashboardApi={mockDashboardApi} />
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
          <AddPanelFlyout dashboardApi={mockDashboardApi} />
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
});
