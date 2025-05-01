/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { alertsFiltersMetadata } from '../filters';
import { AlertsFiltersFormItem, AlertsFiltersFormItemProps } from './alerts_filters_form_item';

jest.mock('../filters', () => {
  const original: { alertsFiltersMetadata: typeof alertsFiltersMetadata } =
    jest.requireActual('../filters');
  return {
    alertsFiltersMetadata: Object.fromEntries(
      Object.entries(original.alertsFiltersMetadata).map(([key, value]) => [
        key,
        {
          ...value,
          component: jest
            .fn()
            .mockImplementation((props) => (
              <div data-test-subj={`${key}Filter`}>{props.value}</div>
            )),
        },
      ])
    ),
  };
});

const mockOnTypeChange = jest.fn();
const mockOnValueChange = jest.fn();

const TestComponent = (overrides: Partial<AlertsFiltersFormItemProps<unknown>>) => {
  const [type, setType] = useState(overrides?.type);
  const [value, setValue] = useState(overrides?.value);

  mockOnTypeChange.mockImplementation(setType);
  mockOnValueChange.mockImplementation(setValue);

  return (
    <IntlProvider locale="en">
      <AlertsFiltersFormItem
        type={type}
        onTypeChange={mockOnTypeChange}
        value={value}
        onValueChange={mockOnValueChange}
        {...overrides}
      />
    </IntlProvider>
  );
};

describe('AlertsFiltersFormItem', () => {
  it('should show all available filter types as options', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByRole('button'));
    Object.values(alertsFiltersMetadata).forEach((filterMeta) => {
      expect(screen.getByText(filterMeta.displayName)).toBeInTheDocument();
    });
  });

  it('should render the correct filter component for the selected type', () => {
    render(<TestComponent type={alertsFiltersMetadata.ruleTags.id} />);

    expect(screen.getByTestId('ruleTagsFilter')).toBeInTheDocument();
  });

  it('should forward the correct props to the selected filter component', () => {
    render(<TestComponent type={alertsFiltersMetadata.ruleTags.id} value={['tag1']} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(alertsFiltersMetadata.ruleTags.component).toHaveBeenCalledWith(
      {
        value: ['tag1'],
        onChange: mockOnValueChange,
        isDisabled: false,
      },
      {}
    );
  });

  it('should call onTypeChange when the type is changed', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(alertsFiltersMetadata.ruleTags.displayName));

    expect(mockOnTypeChange).toHaveBeenCalledWith(alertsFiltersMetadata.ruleTags.id);
  });
});
