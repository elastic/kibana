/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertsFiltersForm, AlertsFiltersFormProps } from './alerts_filters_form';
import { AlertsFiltersFormItem } from './alerts_filters_form_item';
import { AlertsFiltersExpression } from '../types';
import {
  ADD_OR_OPERATION_BUTTON_SUBJ,
  DELETE_OPERAND_BUTTON_SUBJ,
  FORM_ITEM_SUBJ,
} from '../constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
jest.mock('./alerts_filters_form_item');
jest
  .mocked(AlertsFiltersFormItem)
  .mockImplementation(({ value }) => (
    <div data-test-subj={FORM_ITEM_SUBJ}>{value as ReactNode}</div>
  ));

const testExpression: AlertsFiltersExpression = [
  { filter: { type: 'ruleTypes', value: 'filter1' } },
  { operator: 'and' },
  { filter: { type: 'ruleTypes', value: 'filter2' } },
  { operator: 'or' },
  { filter: { type: 'ruleTypes', value: 'filter3' } },
];

const mockOnChange = jest.fn();

const TestComponent = (overrides: Partial<AlertsFiltersFormProps>) => {
  const [value, setValue] = useState(testExpression);

  mockOnChange.mockImplementation(setValue);

  return (
    <IntlProvider locale="en">
      <AlertsFiltersForm
        ruleTypeIds={[]}
        value={value}
        onChange={mockOnChange}
        services={{ http, notifications }}
        {...overrides}
      />
    </IntlProvider>
  );
};

describe('AlertsFiltersForm', () => {
  it('should render boolean expressions', () => {
    render(<TestComponent />);

    ['filter1', 'filter2', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
  });

  it('should delete the correct operand when clicking on the trash icon', async () => {
    render(<TestComponent />);

    ['filter1', 'filter2', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByTestId(DELETE_OPERAND_BUTTON_SUBJ)[0]);

    ['filter1', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
    expect(screen.queryByText('filter2')).not.toBeInTheDocument();
    expect(mockOnChange).toHaveBeenCalledWith([
      ...testExpression.slice(0, 1),
      ...testExpression.slice(3),
    ]);
  });

  it('should correctly add a new operand', async () => {
    render(<TestComponent />);

    expect(screen.getAllByTestId(FORM_ITEM_SUBJ)).toHaveLength(3);

    await userEvent.click(screen.getByTestId(ADD_OR_OPERATION_BUTTON_SUBJ));

    const formItems = screen.getAllByTestId(FORM_ITEM_SUBJ);
    expect(formItems).toHaveLength(4);
    // New operands should be empty
    expect(formItems[3]).toHaveTextContent('');
    expect(mockOnChange).toHaveBeenCalledWith([
      ...testExpression,
      { operator: 'or' },
      { filter: {} },
    ]);
  });

  it('should pass the correct props to AlertsFiltersFormItem', () => {
    render(<TestComponent />);
    const commonProps = {
      type: 'ruleTypes',
      isDisabled: false,
      onTypeChange: expect.any(Function),
      onValueChange: expect.any(Function),
    };
    expect(AlertsFiltersFormItem).toHaveBeenNthCalledWith(
      1,
      {
        ...commonProps,
        value: 'filter1',
      },
      {}
    );
    expect(AlertsFiltersFormItem).toHaveBeenNthCalledWith(
      2,
      {
        ...commonProps,
        value: 'filter2',
      },
      {}
    );
    expect(AlertsFiltersFormItem).toHaveBeenNthCalledWith(
      3,
      {
        ...commonProps,
        value: 'filter3',
      },
      {}
    );
  });
});
