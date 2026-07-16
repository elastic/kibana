/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';

import type { ProjectPickerState } from '../../../../../state/reducers';
import { ProjectPickerFilterDisplay } from './filter_display';

const mockUseProjectPickerState = jest.fn();
const mockUseProjectPickerActions = jest.fn();

jest.mock('../../../../../state', () => ({
  useProjectPickerState: () => mockUseProjectPickerState(),
  useProjectPickerActions: () => mockUseProjectPickerActions(),
}));

const createFilterExpressions = (
  entries: Array<[string, string, boolean?]>
): ProjectPickerState['filterExpressions'] =>
  new Map(entries.map(([id, expression, enabled = true]) => [id, { expression, enabled }]));

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => ({
  filterExpressions: new Map(),
  filteringDimensions: [],
  availableProjects: new Map(),
  excludedOverrides: [],
  filteredProjectIds: [],
  visibleProjectIds: [],
  selectedProjects: [],
  ...overrides,
});

const defaultActions = {
  invertFilterExpressionOperator: jest.fn(),
  toggleFilterExpression: jest.fn(),
  removeFilterExpression: jest.fn(),
};

const renderComponent = (
  stateOverrides: Partial<ProjectPickerState> = {},
  props: { onEditFilter?: jest.Mock } = {}
) => {
  const onEditFilter = props.onEditFilter ?? jest.fn();
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue(defaultActions);

  return {
    onEditFilter,
    ...render(
      <EuiThemeProvider>
        <ProjectPickerFilterDisplay onEditFilter={onEditFilter} />
      </EuiThemeProvider>
    ),
  };
};

describe('ProjectPickerFilterDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the filter display container and add filter button', () => {
    renderComponent();

    expect(screen.getByTestId('projectPickerFilterDisplayContainer')).toBeInTheDocument();
    expect(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeInTheDocument();
    expect(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn')).toHaveTextContent(
      'Add project tag filter'
    );
  });

  it('should call onEditFilter with null when the add filter button is clicked', async () => {
    const user = userEvent.setup();
    const { onEditFilter } = renderComponent();

    await user.click(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn'));

    expect(onEditFilter).toHaveBeenCalledTimes(1);
    expect(onEditFilter).toHaveBeenCalledWith(null);
  });

  it('should render a badge for each applied filter expression', () => {
    renderComponent({
      filterExpressions: createFilterExpressions([
        ['f1', 'is:_type:security'],
        ['f2', 'is:env:prod'],
      ]),
      selectedProjects: ['p1'],
    });

    expect(screen.getByText('is:_type:security')).toBeInTheDocument();
    expect(screen.getByText('is:env:prod')).toBeInTheDocument();
  });

  it('should display the no-match callout when filters are applied and no projects are visible', () => {
    renderComponent({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      visibleProjectIds: [],
      filteredProjectIds: [],
    });

    const callout = screen.getByTestId('projectPickerFilterDisplayNoMatchCallout');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('No projects are currently being searched');
    expect(callout).toHaveTextContent(
      'Adjust your project filters and toggles to ensure at least one project is included in your search.'
    );
  });

  it('should not display the no-match callout when filters are applied and projects are visible', () => {
    renderComponent({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      visibleProjectIds: ['p1'],
      filteredProjectIds: ['p1'],
    });

    expect(
      screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
    ).not.toBeInTheDocument();
  });

  it('should not display the no-match callout when there are no visible projects but no filters are applied', () => {
    renderComponent({
      filterExpressions: new Map(),
      visibleProjectIds: [],
    });

    expect(
      screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
    ).not.toBeInTheDocument();
  });

  it('should open the filter badge context menu when a filter badge is clicked', async () => {
    const user = userEvent.setup();

    renderComponent({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      selectedProjects: ['p1'],
    });

    await user.click(screen.getByText('is:_type:security'));

    expect(screen.getByLabelText('Filter actions for is:_type:security')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Convert to exclusion')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('should call onEditFilter with the selected filter when Edit is chosen from the context menu', async () => {
    const user = userEvent.setup();
    const { onEditFilter } = renderComponent({
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
      selectedProjects: ['p1'],
    });

    await user.click(screen.getByText('is:_type:security'));
    await user.click(screen.getByText('Edit'));

    expect(onEditFilter).toHaveBeenCalledWith({
      id: 'f1',
      expression: 'is:_type:security',
    });
  });
});
