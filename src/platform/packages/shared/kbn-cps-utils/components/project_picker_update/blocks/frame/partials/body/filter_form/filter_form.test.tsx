/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';

import type { CPSProject } from '../../../../../../../types';
import type { ProjectPickerState } from '../../../../../state/reducers';
import { ProjectPickerFilterForm } from './filter_form';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../../../../../utils/filter_input_codec';

const securityProject: CPSProject = {
  _id: 'project-security',
  _alias: 'Security',
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _csp: 'AWS',
  env: 'prod',
};

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const typeSecurityKey = getFilterExpressionLookupKey(typeSecurityExpression);

const mockUseProjectPickerState = jest.fn();
const mockUseProjectPickerActions = jest.fn();

jest.mock('../../../../../state', () => ({
  useProjectPickerState: () => mockUseProjectPickerState(),
  useProjectPickerActions: () => mockUseProjectPickerActions(),
}));

const createFilterExpressions = (
  entries: Array<[FilterExpressionValue, boolean?]>
): ProjectPickerState['filterExpressions'] =>
  new Map(
    entries.map(([expression, enabled = true]) => [
      getFilterExpressionLookupKey(expression),
      { expression, enabled },
    ])
  );

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => ({
  filterExpressions: new Map(),
  filteringDimensions: ['_type', 'env'],
  availableProjects: new Map([[securityProject._id, securityProject]]),
  excludedOverrides: [],
  filteredProjectIds: [securityProject._id],
  visibleProjectIds: [securityProject._id],
  selectedProjects: [securityProject._id],
  ...overrides,
});

const defaultActions = {
  addFilterExpression: jest.fn(),
  updateFilterExpression: jest.fn(),
};

const renderForm = (
  stateOverrides: Partial<ProjectPickerState> = {},
  props: { filterId?: string; onCloseFilterFormRequested?: jest.Mock } = {}
) => {
  const onCloseFilterFormRequested = props.onCloseFilterFormRequested ?? jest.fn();
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue(defaultActions);

  return {
    onCloseFilterFormRequested,
    ...render(
      <EuiThemeProvider>
        <ProjectPickerFilterForm
          filterId={props.filterId}
          onCloseFilterFormRequested={onCloseFilterFormRequested}
        />
      </EuiThemeProvider>
    ),
  };
};

const selectOption = async (user: ReturnType<typeof userEvent.setup>, optionText: string) => {
  await user.click(await screen.findByRole('option', { name: optionText }));
};

const fillFilterForm = async (
  user: ReturnType<typeof userEvent.setup>,
  { tagName, tagValue }: { tagName: string; tagValue: string }
) => {
  await user.click(screen.getByRole('button', { name: 'Select a tag' }));
  await selectOption(user, tagName);

  // Operator defaults to "is" when a tag is selected.
  const valueCombo = screen.getByTestId('comboBoxInput');
  await user.click(valueCombo);
  await selectOption(user, tagValue);
};

describe('ProjectPickerFilterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a filter and closes the form when submit succeeds', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderForm();

    await fillFilterForm(user, { tagName: '_type', tagValue: 'security' });

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(defaultActions.addFilterExpression).toHaveBeenCalledWith({
      expression: {
        operator: FilterOperator.EQUALS,
        tagName: '_type',
        tagValue: 'security',
      },
    });
    expect(onCloseFilterFormRequested).toHaveBeenCalled();
  });

  it('surfaces a duplicate validation error on submit and does not mutate state', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderForm({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    await fillFilterForm(user, { tagName: '_type', tagValue: 'security' });

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      screen.getByText('This filter already exists. Change the filter or edit the existing one.')
    ).toBeInTheDocument();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('surfaces a zero-match validation error on submit and does not mutate state', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderForm();

    await fillFilterForm(user, { tagName: 'env', tagValue: 'prod' });

    // Create a custom value that matches no projects.
    const comboInput = within(screen.getByTestId('comboBoxInput')).getByRole('combobox');
    await user.clear(comboInput);
    await user.type(comboInput, 'staging{enter}');

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      screen.getByText(
        'No projects match this filter. Adjust so at least one project is included in your search.'
      )
    ).toBeInTheDocument();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('updates an existing filter when editing and submit succeeds', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderForm(
      {
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      },
      { filterId: typeSecurityKey }
    );

    // Default values are loaded for the edited filter; change the value to env:prod.
    await user.click(screen.getByRole('button', { name: '_type' }));
    await selectOption(user, 'env');

    const valueCombo = screen.getByTestId('comboBoxInput');
    await user.click(valueCombo);
    await selectOption(user, 'prod');

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(defaultActions.updateFilterExpression).toHaveBeenCalledWith({
      id: typeSecurityKey,
      expression: {
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: 'prod',
      },
    });
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).toHaveBeenCalled();
  });
});
