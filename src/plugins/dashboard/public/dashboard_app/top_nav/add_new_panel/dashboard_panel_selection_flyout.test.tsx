/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DashboardPanelSelectionListFlyout } from './dashboard_panel_selection_flyout';
import type { GroupedAddPanelActions } from './add_panel_action_menu_items';

const defaultProps: Omit<
  ComponentProps<typeof DashboardPanelSelectionListFlyout>,
  'fetchDashboardPanels'
> = {
  close: jest.fn(),
  paddingSize: 's',
};

const renderComponent = ({
  fetchDashboardPanels,
}: Pick<ComponentProps<typeof DashboardPanelSelectionListFlyout>, 'fetchDashboardPanels'>) =>
  render(
    <IntlProvider locale="en">
      <DashboardPanelSelectionListFlyout
        {...defaultProps}
        fetchDashboardPanels={fetchDashboardPanels}
      />
    </IntlProvider>
  );

const panelConfiguration: GroupedAddPanelActions[] = [
  {
    id: 'panel1',
    title: 'App 1',
    items: [
      {
        icon: 'icon1',
        id: 'mockFactory',
        name: 'Factory 1',
        description: 'Factory 1 description',
        'data-test-subj': 'createNew-mockFactory',
        onClick: jest.fn(),
        order: 0,
      },
    ],
    order: 10,
    'data-test-subj': 'dashboardEditorMenu-group1Group',
  },
];

describe('DashboardPanelSelectionListFlyout', () => {
  it('renders a loading indicator when fetchDashboardPanel has not yielded any value', async () => {
    const promiseDelay = 5000;

    renderComponent({
      fetchDashboardPanels: jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(panelConfiguration), promiseDelay);
          })
      ),
    });

    expect(
      await screen.findByTestId('dashboardPanelSelectionLoadingIndicator')
    ).toBeInTheDocument();
  });

  it('renders an error indicator when fetchDashboardPanel errors', async () => {
    renderComponent({
      fetchDashboardPanels: jest.fn().mockRejectedValue(new Error('simulated error')),
    });

    expect(await screen.findByTestId('dashboardPanelSelectionErrorIndicator')).toBeInTheDocument();
  });

  it('renders the list of available panels when fetchDashboardPanel resolves a value', async () => {
    renderComponent({ fetchDashboardPanels: jest.fn().mockResolvedValue(panelConfiguration) });

    expect(await screen.findByTestId(panelConfiguration[0]['data-test-subj']!)).toBeInTheDocument();
  });

  it('renders a not found message when a user searches for an item that is not in the selection list', async () => {
    renderComponent({ fetchDashboardPanels: jest.fn().mockResolvedValue(panelConfiguration) });

    expect(await screen.findByTestId(panelConfiguration[0]['data-test-subj']!)).toBeInTheDocument();

    act(() => {
      userEvent.type(
        screen.getByTestId('dashboardPanelSelectionFlyout__searchInput'),
        'non existent panel'
      );
    });

    expect(await screen.findByTestId('dashboardPanelSelectionNoPanelMessage')).toBeInTheDocument();
  });

  it('invokes the close method when the flyout close btn is clicked', async () => {
    renderComponent({ fetchDashboardPanels: jest.fn().mockResolvedValue(panelConfiguration) });

    fireEvent.click(await screen.findByTestId('dashboardPanelSelectionCloseBtn'));

    expect(defaultProps.close).toHaveBeenCalled();
  });
});
