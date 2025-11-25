/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { AddFilter } from './add_filter';

type RenderAddFilterComponentProps = React.ComponentProps<typeof AddFilter>;

const mockMakeRegExTest = jest.fn(() => true);

jest.mock('@kbn/kibana-utils-plugin/common/field_wildcard', () => {
  const originalModule = jest.requireActual('@kbn/kibana-utils-plugin/common/field_wildcard');
  return {
    ...originalModule,
    makeRegEx: () => {
      return {
        test: mockMakeRegExTest,
      } as unknown as RegExp;
    },
  };
});

const renderAddFilterComponent = (
  { onAddFilter }: RenderAddFilterComponentProps = { onAddFilter: jest.fn() }
) => {
  return renderWithI18n(<AddFilter onAddFilter={onAddFilter} />);
};

describe('AddFilter', () => {
  test('should render normally', async () => {
    renderAddFilterComponent();

    expect(screen.getByTestId('fieldFilterInput')).toBeVisible();
  });

  test('should allow adding a filter', async () => {
    const user = userEvent.setup();
    const onAddFilter = jest.fn();
    renderAddFilterComponent({ onAddFilter });

    await user.type(screen.getByTestId('fieldFilterInput'), 'tim*');
    await user.click(screen.getByText('Add'));
    expect(onAddFilter).toBeCalledWith('tim*');
  });

  test('should ignore strings with just spaces', async () => {
    const user = userEvent.setup();
    const onAddFilter = jest.fn();

    renderAddFilterComponent({ onAddFilter });

    // Set a value in the input field
    await user.type(screen.getByTestId('fieldFilterInput'), ' ');
    await user.click(screen.getByText('Add'));
    expect(onAddFilter).not.toBeCalled();
  });

  test('should handle errors with invalid filter patterns', async () => {
    const user = userEvent.setup();

    // Simulate makeRegEx throwing an error for invalid regex
    mockMakeRegExTest.mockImplementationOnce(() => {
      throw new Error('Invalid regex');
    });

    renderAddFilterComponent();

    // Set a value in the input field, we know this will be regarded as invalid because of the mock above
    await user.type(screen.getByTestId('fieldFilterInput'), '*//foo');
    // Trigger the blur event to validate the input
    await user.tab();

    expect(await screen.findByTestId('fieldFilterInput')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('addFieldFilterButton')).toBeDisabled();

    // This would be regarded as a valid regex
    await user.type(screen.getByTestId('fieldFilterInput'), '*//foo');
    await user.tab();

    expect(await screen.findByTestId('fieldFilterInput')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByTestId('addFieldFilterButton')).not.toBeDisabled();
  });
});
