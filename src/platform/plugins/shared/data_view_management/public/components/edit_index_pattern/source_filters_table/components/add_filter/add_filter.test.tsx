/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { AddFilter } from './add_filter';

const renderAddFilterComponent = (
  { onAddFilter }: React.ComponentProps<typeof AddFilter> = { onAddFilter: jest.fn() }
) => {
  return render(
    <IntlProvider locale="en">
      <AddFilter onAddFilter={onAddFilter} />
    </IntlProvider>
  );
};

describe('AddFilter', () => {
  test('should render normally', async () => {
    renderAddFilterComponent();

    expect(await screen.findByTestId('fieldFilterInput')).toBeInTheDocument();
  });

  test('should allow adding a filter', async () => {
    const user = userEvent.setup();
    const onAddFilter = jest.fn();
    renderAddFilterComponent({ onAddFilter });

    await user.type(screen.getByTestId('fieldFilterInput'), 'tim*');

    await user.click(screen.getByTestId('addFieldFilterButton'));

    await waitFor(() => {
      expect(onAddFilter).toBeCalledWith('tim*');
    });
  });

  test('should ignore strings with just spaces', async () => {
    const user = userEvent.setup();
    const onAddFilter = jest.fn();

    renderAddFilterComponent({ onAddFilter });

    // Set a value in the input field
    await user.type(screen.getByTestId('fieldFilterInput'), ' ');
    await user.click(screen.getByTestId('addFieldFilterButton'));
    await waitFor(() => {
      expect(onAddFilter).not.toBeCalled();
    });
  });
});
