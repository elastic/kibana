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

const typeExistsExpression = {
  operator: FilterOperator.EXISTS,
  tagName: '_type',
  tagValue: undefined,
} as const;

const envStagingExpression = {
  operator: FilterOperator.EQUALS,
  tagName: 'env',
  tagValue: 'staging',
} as const;

const envExistsExpression = {
  operator: FilterOperator.EXISTS,
  tagName: 'env',
  tagValue: undefined,
} as const;

const envOneOfProdExpression: FilterExpressionValue = {
  operator: FilterOperator.ONE_OF,
  tagName: 'env',
  tagValue: ['prod'],
};

const typeSecurityKey = getFilterExpressionLookupKey(typeSecurityExpression);
const envStagingKey = getFilterExpressionLookupKey(envStagingExpression);
const PREFILLED_FILTER_ID = 'prefilled-filter';

const mockUseProjectPickerState = jest.fn();
const mockUseProjectPickerActions = jest.fn();
const mockFetchProjectsByRouting = jest.fn();

jest.mock('../../../../../state', () => ({
  useProjectPickerState: () => mockUseProjectPickerState(),
  useProjectPickerActions: () => mockUseProjectPickerActions(),
  useFetchProjectsByRouting: () => mockFetchProjectsByRouting,
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

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const filterExpressions = overrides.filterExpressions ?? new Map();

  return {
    filterExpressions,
    filteringDimensions: ['_type', 'env'],
    availableProjects: new Map([[securityProject._id, securityProject]]),
    excludedOverrides: [],
    proposedFilters: null,
    filteredProjectIds: [securityProject._id],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [securityProject._id],
    selectedProjectIds: [securityProject._id],
    currentProjectRouting: '_alias:*',
    defaultProjectRouting: '_alias:*',
    isUsingSpaceDefaults: true,
    displayedFilterExpressions: filterExpressions,
    isFilterProposalPending: false,
    originProjectId: securityProject._id,
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
    controlsState: 'enabled',
    ...overrides,
  };
};

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

const renderPrefilledForm = (
  expression: FilterExpressionValue,
  duplicateExpressions: FilterExpressionValue[] = []
) =>
  renderForm(
    {
      filterExpressions: new Map([
        ...createFilterExpressions(duplicateExpressions.map((item) => [item])),
        [PREFILLED_FILTER_ID, { expression, enabled: true }],
      ]),
    },
    { filterId: PREFILLED_FILTER_ID }
  );

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
    mockFetchProjectsByRouting.mockImplementation(async (routing?: string) => {
      if (!routing) {
        return { origin: securityProject, linkedProjects: [] };
      }
      // Match env:prod / _type:security style equals clauses used in these tests.
      const matches = routing.includes('_type:security') || routing.includes('env:prod');
      if (matches && !routing.includes('staging') && !routing.includes('env:staging')) {
        return { origin: securityProject, linkedProjects: [] };
      }
      return { origin: null, linkedProjects: [] };
    });
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
    const { onCloseFilterFormRequested } = renderPrefilledForm(typeSecurityExpression, [
      typeSecurityExpression,
    ]);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      screen.getByText('This filter already exists. Change the filter or edit the existing one.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'is' })).not.toHaveClass(
      'euiSuperSelectControl-isInvalid'
    );
    expect(mockFetchProjectsByRouting).not.toHaveBeenCalled();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(defaultActions.updateFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('surfaces a zero-match validation error on submit and does not mutate state', async () => {
    const user = userEvent.setup();
    mockFetchProjectsByRouting.mockResolvedValue({ origin: null, linkedProjects: [] });
    const { onCloseFilterFormRequested } = renderPrefilledForm(envStagingExpression);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      await screen.findByText(
        'No projects match this filter. Adjust so at least one project is included in your search.'
      )
    ).toBeInTheDocument();
    expect(mockFetchProjectsByRouting).toHaveBeenCalled();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(defaultActions.updateFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate exists validation error on the operator input', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderPrefilledForm(typeExistsExpression, [
      typeExistsExpression,
    ]);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      await screen.findByText(
        'This filter already exists. Change the filter or edit the existing one.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'exists' })).toHaveClass(
      'euiSuperSelectControl-isInvalid'
    );
    expect(within(screen.getByTestId('comboBoxInput')).getByRole('combobox')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(mockFetchProjectsByRouting).not.toHaveBeenCalled();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(defaultActions.updateFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('surfaces a zero-match exists validation error on the operator input', async () => {
    const user = userEvent.setup();
    mockFetchProjectsByRouting.mockResolvedValue({ origin: null, linkedProjects: [] });
    const { onCloseFilterFormRequested } = renderPrefilledForm(envExistsExpression);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      await screen.findByText(
        'No projects match this filter. Adjust so at least one project is included in your search.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'exists' })).toHaveClass(
      'euiSuperSelectControl-isInvalid'
    );
    expect(within(screen.getByTestId('comboBoxInput')).getByRole('combobox')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(mockFetchProjectsByRouting).toHaveBeenCalled();
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(defaultActions.updateFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).not.toHaveBeenCalled();
  });

  it('clears a submit validation error when a field changes', async () => {
    const user = userEvent.setup();
    renderPrefilledForm(typeSecurityExpression, [typeSecurityExpression]);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      screen.getByText('This filter already exists. Change the filter or edit the existing one.')
    ).toBeInTheDocument();

    mockFetchProjectsByRouting.mockResolvedValue({
      origin: securityProject,
      linkedProjects: [],
    });

    await user.click(screen.getByRole('button', { name: 'is' }));
    await selectOption(user, 'is not');

    expect(
      screen.queryByText('This filter already exists. Change the filter or edit the existing one.')
    ).not.toBeInTheDocument();
    expect(within(screen.getByTestId('comboBoxInput')).getByRole('combobox')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(defaultActions.updateFilterExpression).not.toHaveBeenCalled();
  });

  it('clears the selected value when switching to an exists operator and can submit', async () => {
    const user = userEvent.setup();
    const { onCloseFilterFormRequested } = renderForm();

    await fillFilterForm(user, { tagName: '_type', tagValue: 'security' });

    const valueInput = () => within(screen.getByTestId('comboBoxInput')).getByRole('combobox');
    expect(valueInput()).toHaveValue('security');

    mockFetchProjectsByRouting.mockResolvedValue({
      origin: securityProject,
      linkedProjects: [],
    });

    await user.click(screen.getByRole('button', { name: 'is' }));
    await selectOption(user, 'exists');

    expect(valueInput()).toHaveValue('');

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(defaultActions.addFilterExpression).toHaveBeenCalledWith({
      expression: {
        operator: FilterOperator.EXISTS,
        tagName: '_type',
        tagValue: undefined,
      },
    });
    expect(onCloseFilterFormRequested).toHaveBeenCalled();
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

  it('shows a custom value when editing a filter and keeps it selectable', async () => {
    const user = userEvent.setup();
    mockFetchProjectsByRouting.mockImplementation(async (routing?: string) => {
      if (routing?.includes('env:staging')) {
        return { origin: securityProject, linkedProjects: [] };
      }
      return { origin: null, linkedProjects: [] };
    });

    const { onCloseFilterFormRequested } = renderForm(
      {
        filterExpressions: createFilterExpressions([[envStagingExpression]]),
      },
      { filterId: envStagingKey }
    );

    const valueInput = within(screen.getByTestId('comboBoxInput')).getByRole('combobox');
    expect(valueInput).toHaveValue('staging');

    await user.click(screen.getByTestId('comboBoxInput'));
    expect(await screen.findByRole('option', { name: 'staging' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'prod' })).toBeInTheDocument();

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(defaultActions.updateFilterExpression).toHaveBeenCalledWith({
      id: envStagingKey,
      expression: {
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: 'staging',
      },
    });
    expect(defaultActions.addFilterExpression).not.toHaveBeenCalled();
    expect(onCloseFilterFormRequested).toHaveBeenCalled();
  });

  it('keeps a failed custom value on the input but removes it from selectable options', async () => {
    const user = userEvent.setup();
    mockFetchProjectsByRouting.mockResolvedValue({ origin: null, linkedProjects: [] });
    renderPrefilledForm(envStagingExpression);

    await user.click(screen.getByTestId('projectPickerFilterFormCreateBtn'));

    expect(
      await screen.findByText(
        'No projects match this filter. Adjust so at least one project is included in your search.'
      )
    ).toBeInTheDocument();
    const comboInput = within(screen.getByTestId('comboBoxInput')).getByRole('combobox');
    expect(comboInput).toHaveValue('staging');

    await user.click(screen.getByTestId('comboBoxInput'));
    expect(await screen.findByRole('option', { name: 'prod' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'staging' })).not.toBeInTheDocument();
  });

  it('appends a custom value when using a one-of operator', async () => {
    const user = userEvent.setup();
    renderPrefilledForm(envOneOfProdExpression);

    const comboInput = within(screen.getByTestId('comboBoxInput')).getByRole('combobox');
    await user.type(comboInput, 'staging{enter}');

    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
  });
});
