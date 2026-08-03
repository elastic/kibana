/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  useGetGroupBySelectorRenderer,
  useEsqlDataCascadeHeaderComponent,
} from './use_table_header_components';

describe('useTableHeaderComponents', () => {
  const mockCascadeGroupingChangeHandler = jest.fn();

  it('returns a function to render the group by selector', () => {
    const { result } = renderHook(() =>
      useGetGroupBySelectorRenderer({
        cascadeGroupingChangeHandler: mockCascadeGroupingChangeHandler,
      })
    );

    expect(result.current).toStrictEqual(expect.any(Function));
  });

  it('the returned function returns a valid React component', async () => {
    const availableGroups = ['group1', 'group2'];
    const selectedGroups = ['group1'];

    const { result } = renderHook(() =>
      useGetGroupBySelectorRenderer({
        cascadeGroupingChangeHandler: mockCascadeGroupingChangeHandler,
      })
    );

    const GroupBySelector = (props: { availableGroups: string[]; selectedGroups: string[] }) =>
      result.current(props.availableGroups, props.selectedGroups);

    render(
      <EuiThemeProvider>
        <I18nProvider>
          <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
        </I18nProvider>
      </EuiThemeProvider>
    );

    expect(await screen.findByTestId('discoverEnableCascadeLayoutSwitch')).toBeInTheDocument();
  });

  it('renders a selection list of available groups when clicked', async () => {
    const user = userEvent.setup();
    const availableGroups = ['group1', 'group2'];
    const selectedGroups = ['group1'];

    const { result } = renderHook(() =>
      useGetGroupBySelectorRenderer({
        cascadeGroupingChangeHandler: mockCascadeGroupingChangeHandler,
      })
    );

    const GroupBySelector = (props: { availableGroups: string[]; selectedGroups: string[] }) =>
      result.current(props.availableGroups, props.selectedGroups);

    const { rerender } = render(
      <EuiThemeProvider>
        <I18nProvider>
          <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
        </I18nProvider>
      </EuiThemeProvider>
    );

    const groupSelectionButton = await screen.findByTestId('discoverEnableCascadeLayoutSwitch');

    expect(groupSelectionButton).toBeInTheDocument();

    await user.click(groupSelectionButton);

    // we rerender so the state updates and the popover can be seen
    rerender(
      <EuiThemeProvider>
        <I18nProvider>
          <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
        </I18nProvider>
      </EuiThemeProvider>
    );

    await waitForEuiPopoverOpen();

    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('group2')).toBeInTheDocument();

    await user.click(screen.getByText('group2'));

    await waitFor(() => expect(mockCascadeGroupingChangeHandler).toHaveBeenCalledWith(['group2']));
  });

  it('displays a technical preview tooltip on hover', async () => {
    const user = userEvent.setup();
    const availableGroups = ['group1', 'group2'];
    const selectedGroups = ['group1'];

    const { result } = renderHook(() =>
      useGetGroupBySelectorRenderer({
        cascadeGroupingChangeHandler: mockCascadeGroupingChangeHandler,
      })
    );

    const GroupBySelector = (props: { availableGroups: string[]; selectedGroups: string[] }) =>
      result.current(props.availableGroups, props.selectedGroups);

    render(
      <EuiThemeProvider>
        <I18nProvider>
          <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
        </I18nProvider>
      </EuiThemeProvider>
    );

    const groupSelectionButton = await screen.findByTestId('discoverEnableCascadeLayoutSwitch');

    await user.hover(groupSelectionButton);

    expect(screen.getByText('Grouped results (technical preview)')).toBeInTheDocument();
    expect(screen.getByText('Results are grouped when running a Stats BY')).toBeInTheDocument();
  });
});

describe('useEsqlDataCascadeHeaderComponent', () => {
  const mockCascadeGroupingChangeHandler = jest.fn();

  // Renders the hit-counter-label props it receives so the test can assert on them,
  // in place of the real hit-count toggle (which independently owns the total-hits number).
  const ToggleProbe = ({
    hitCounterLabel,
    hitCounterPluralLabel,
  }: {
    hitCounterLabel?: string;
    hitCounterPluralLabel?: string;
  }) => (
    <div data-test-subj="toggle-probe">
      {hitCounterLabel}/{hitCounterPluralLabel}
    </div>
  );

  const renderCustomHeader = (viewModeToggle: React.ReactElement | undefined) => {
    const { result } = renderHook(() =>
      useEsqlDataCascadeHeaderComponent({
        viewModeToggle,
        cascadeGroupingChangeHandler: mockCascadeGroupingChangeHandler,
      })
    );

    const CustomHeader = () =>
      result.current({
        currentSelectedColumns: ['category'],
        availableColumns: ['category'],
        onGroupSelection: jest.fn(),
        selectedRows: [],
      });

    render(
      <EuiThemeProvider>
        <I18nProvider>
          <CustomHeader />
        </I18nProvider>
      </EuiThemeProvider>
    );
  };

  it('clones the view mode toggle with "group"/"groups" hit counter labels, instead of the generic hit labels', () => {
    renderCustomHeader(<ToggleProbe />);

    expect(screen.getByTestId('toggle-probe')).toHaveTextContent('group/groups');
  });

  it('still renders the group-by selector when no view mode toggle is provided', () => {
    renderCustomHeader(undefined);

    expect(screen.queryByTestId('toggle-probe')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverEnableCascadeLayoutSwitch')).toBeInTheDocument();
  });
});
