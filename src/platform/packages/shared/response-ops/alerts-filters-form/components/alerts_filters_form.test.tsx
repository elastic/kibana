/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertsFiltersForm } from './alerts_filters_form';
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

const testExpression: AlertsFiltersExpression = {
  operator: 'or',
  operands: [
    {
      operator: 'and',
      operands: [{ value: 'filter1' }, { value: 'filter2' }],
    },
    { value: 'filter3' },
  ],
};

describe('AlertsFiltersForm', () => {
  it('should render boolean expressions', () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersForm
          ruleTypeIds={[]}
          value={testExpression}
          onChange={jest.fn()}
          services={{ http, notifications }}
        />
      </IntlProvider>
    );

    ['filter1', 'filter2', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
  });

  it('should delete the correct operand when clicking on the trash icon', async () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersForm
          ruleTypeIds={[]}
          value={testExpression}
          onChange={jest.fn()}
          services={{ http, notifications }}
        />
      </IntlProvider>
    );

    ['filter1', 'filter2', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByTestId(DELETE_OPERAND_BUTTON_SUBJ)[0]);

    ['filter1', 'filter3'].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
    expect(screen.queryByText('filter2')).not.toBeInTheDocument();
  });

  it('should correctly add a new operand', async () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersForm
          ruleTypeIds={[]}
          value={testExpression}
          onChange={jest.fn()}
          services={{ http, notifications }}
        />
      </IntlProvider>
    );

    expect(screen.getAllByTestId(FORM_ITEM_SUBJ)).toHaveLength(3);

    await userEvent.click(screen.getByTestId(ADD_OR_OPERATION_BUTTON_SUBJ));

    const formItems = screen.getAllByTestId(FORM_ITEM_SUBJ);
    expect(formItems).toHaveLength(4);
    // New operands should be empty
    expect(formItems[3]).toHaveTextContent('');
  });
});
