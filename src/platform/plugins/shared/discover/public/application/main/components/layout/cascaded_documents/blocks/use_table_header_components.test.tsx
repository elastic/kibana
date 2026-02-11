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
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { useGetGroupBySelectorRenderer } from './use_table_header_components';

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
      <IntlProvider locale="en">
        <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
      </IntlProvider>
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
      <IntlProvider locale="en">
        <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
      </IntlProvider>
    );

    const groupSelectionButton = await screen.findByTestId('discoverEnableCascadeLayoutSwitch');

    expect(groupSelectionButton).toBeInTheDocument();

    await user.click(groupSelectionButton);

    // we rerender so the state updates and the popover can be seen
    rerender(
      <IntlProvider locale="en">
        <GroupBySelector availableGroups={availableGroups} selectedGroups={selectedGroups} />
      </IntlProvider>
    );

    await waitForEuiPopoverOpen();

    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('group2')).toBeInTheDocument();

    await user.click(screen.getByText('group2'));

    await waitFor(() => expect(mockCascadeGroupingChangeHandler).toHaveBeenCalledWith(['group2']));
  });
});
