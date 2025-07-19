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
import type { AlertsFiltersFormProps } from './alerts_filters_form';
import { AlertsFiltersForm } from './alerts_filters_form';
import type { AlertsFilter, AlertsFiltersExpression } from '../types';
import {
  ADD_AND_OPERATION_BUTTON_SUBJ,
  ADD_OR_OPERATION_BUTTON_SUBJ,
  DELETE_OPERAND_BUTTON_SUBJ,
  FILTERS_FORM_ITEM_SUBJ,
} from '../constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import {
  FORM_ITEM_FILTER_BY_LABEL,
  FORM_ITEM_FILTER_BY_PLACEHOLDER,
  RULE_TAGS_FILTER_LABEL,
  RULE_TYPES_FILTER_LABEL,
} from '../translations';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const TAG_1 = 'tag1';
const TAG_2 = 'tag2';
const TAG_3 = 'tag3';

jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query');
const { useGetRuleTagsQuery: mockUseGetRuleTagsQuery } = jest.requireMock(
  '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query'
);
mockUseGetRuleTagsQuery.mockReturnValue({
  tags: [TAG_1, TAG_2, TAG_3],
  isLoading: false,
  isError: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query');
const { useGetInternalRuleTypesQuery: mockUseGetInternalRuleTypesQuery } = jest.requireMock(
  '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query'
);
mockUseGetInternalRuleTypesQuery.mockReturnValue({
  data: [{ id: 'testType', name: 'Test Type', solution: 'stack' }],
  isLoading: false,
  isError: false,
});

const testExpression: AlertsFiltersExpression = [
  { filter: { type: 'ruleTags', value: [TAG_1] } },
  { operator: 'and' },
  { filter: { type: 'ruleTags', value: [TAG_2] } },
  { operator: 'or' },
  { filter: { type: 'ruleTags', value: [TAG_3] } },
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

    [TAG_1, TAG_2, TAG_3].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
  });

  it('should delete the correct operand when clicking on the trash icon', async () => {
    render(<TestComponent />);

    [TAG_1, TAG_2, TAG_3].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByTestId(DELETE_OPERAND_BUTTON_SUBJ)[0]);

    [TAG_1, TAG_3].forEach((filter) => {
      expect(screen.getByText(filter)).toBeInTheDocument();
    });
    expect(screen.queryByText(TAG_2)).not.toBeInTheDocument();
    expect(mockOnChange).toHaveBeenCalledWith([
      ...testExpression.slice(0, 1),
      ...testExpression.slice(3),
    ]);
  });

  it('should correctly add a new operand', async () => {
    render(<TestComponent />);

    expect(screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ)).toHaveLength(3);

    await userEvent.click(screen.getByTestId(ADD_OR_OPERATION_BUTTON_SUBJ));

    const formItems = screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ);
    expect(formItems).toHaveLength(4);
    // New operands should be empty
    expect(formItems[3]).toHaveTextContent(FORM_ITEM_FILTER_BY_PLACEHOLDER);
    expect(mockOnChange).toHaveBeenCalledWith([
      ...testExpression,
      { operator: 'or' },
      { filter: {} },
    ]);
  });

  it('should correctly change filter types', async () => {
    render(<TestComponent />);

    const filterTypeSelectors = screen.getAllByRole('button', {
      name: `${RULE_TAGS_FILTER_LABEL} , ${FORM_ITEM_FILTER_BY_LABEL}`,
    });
    await userEvent.click(filterTypeSelectors[0]);
    await userEvent.click(screen.getByRole('option', { name: RULE_TYPES_FILTER_LABEL }));
    expect(mockOnChange).toHaveBeenCalledWith([
      { filter: { type: 'ruleTypes' } },
      ...testExpression.slice(1),
    ]);
  });

  it('should correctly change filter values', async () => {
    render(<TestComponent />);

    const filterValueDropdownToggles = screen.getAllByRole('button', {
      name: 'Open list of options',
    });
    await userEvent.click(filterValueDropdownToggles[0]);
    await userEvent.click(screen.getByRole('option', { name: TAG_2 }));
    expect(mockOnChange).toHaveBeenCalledWith([
      {
        filter: {
          ...(testExpression[0] as { filter: AlertsFilter }).filter,
          value: [TAG_1, TAG_2],
        },
      },
      ...testExpression.slice(1),
    ]);
  });

  it('should prevent the user from adding more filters than `maxFilters`', async () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersForm
          ruleTypeIds={[]}
          value={[
            { filter: { type: 'ruleTypes', value: 'filter1' } },
            { operator: 'or' },
            { filter: { type: 'ruleTypes', value: 'filter2' } },
            { operator: 'or' },
            { filter: { type: 'ruleTypes', value: 'filter3' } },
            { operator: 'or' },
            { filter: { type: 'ruleTypes', value: 'filter4' } },
            { operator: 'or' },
            { filter: { type: 'ruleTypes', value: 'filter5' } },
          ]}
          onChange={jest.fn()}
          services={{ http, notifications }}
        />
      </IntlProvider>
    );

    expect(screen.queryByTestId(ADD_OR_OPERATION_BUTTON_SUBJ)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ADD_AND_OPERATION_BUTTON_SUBJ)).not.toBeInTheDocument();
  });
});
