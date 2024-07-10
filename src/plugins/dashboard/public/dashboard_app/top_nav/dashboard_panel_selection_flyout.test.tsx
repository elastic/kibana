/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type ComponentProps } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Subject } from 'rxjs';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DashboardPanelSelectionListFlyout } from './dashboard_panel_selection_flyout';
import type { GroupedAddPanelActions } from './add_panel_action_menu_items';

let panels$: Subject<GroupedAddPanelActions[]>;

const defaultProps: Omit<
  ComponentProps<typeof DashboardPanelSelectionListFlyout>,
  'dashboardPanels$'
> = {
  close: jest.fn(),
  paddingSize: 's',
};

const renderComponent = ({
  dashboardPanels$,
}: Pick<ComponentProps<typeof DashboardPanelSelectionListFlyout>, 'dashboardPanels$'>) =>
  render(
    <IntlProvider locale="en">
      <DashboardPanelSelectionListFlyout {...defaultProps} dashboardPanels$={dashboardPanels$} />
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
  beforeEach(() => {
    panels$ = new Subject<GroupedAddPanelActions[]>();
  });

  it('renders a loading indicator when the panels observable has not yielded any value', async () => {
    renderComponent({ dashboardPanels$: panels$.asObservable() });

    expect(
      await screen.findByTestId('dashboardPanelSelectionLoadingIndicator')
    ).toBeInTheDocument();
  });

  it('renders a error indicator when the panels observable yields an error', async () => {
    renderComponent({ dashboardPanels$: panels$.asObservable() });

    expect(
      await screen.findByTestId('dashboardPanelSelectionLoadingIndicator')
    ).toBeInTheDocument();

    act(() => {
      panels$.error(new Error('simulated error'));
    });

    expect(await screen.findByTestId('dashboardPanelSelectionErrorIndicator')).toBeInTheDocument();
  });

  it('renders the list of available panels when the panels observable yields its value', async () => {
    renderComponent({ dashboardPanels$: panels$.asObservable() });

    expect(
      await screen.findByTestId('dashboardPanelSelectionLoadingIndicator')
    ).toBeInTheDocument();

    act(() => {
      panels$.next(panelConfiguration);
    });

    expect(screen.queryByTestId('dashboardPanelSelectionLoadingIndicator')).not.toBeInTheDocument();

    expect(await screen.findByTestId(panelConfiguration[0]['data-test-subj']!)).toBeInTheDocument();
  });

  it('renders a not found message when a user searches for an item that is not in the selection list', async () => {
    renderComponent({ dashboardPanels$: panels$.asObservable() });

    expect(
      await screen.findByTestId('dashboardPanelSelectionLoadingIndicator')
    ).toBeInTheDocument();

    act(() => {
      panels$.next(panelConfiguration);
    });

    expect(await screen.findByTestId(panelConfiguration[0]['data-test-subj']!)).toBeInTheDocument();

    userEvent.type(
      screen.getByTestId('dashboardPanelSelectionFlyout__searchInput'),
      'non existent panel'
    );

    expect(await screen.findByTestId('dashboardPanelSelectionNoPanelMessage')).toBeInTheDocument();
  });

  it('invokes the close method when the flyout close btn is clicked', async () => {
    renderComponent({ dashboardPanels$: panels$.asObservable() });

    act(() => {
      panels$.next(panelConfiguration);
    });

    fireEvent.click(await screen.findByTestId('dashboardPanelSelectionCloseBtn'));

    expect(defaultProps.close).toHaveBeenCalled();
  });
});
