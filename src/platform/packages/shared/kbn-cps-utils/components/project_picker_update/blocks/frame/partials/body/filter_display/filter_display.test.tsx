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
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../../../../../utils/filter_input_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const typeSecurityKey = getFilterExpressionLookupKey(typeSecurityExpression);

const envProdExpression = {
  operator: FilterOperator.EQUALS,
  tagName: 'env',
  tagValue: 'prod',
} as const;

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
  props: { onEditFilter?: jest.Mock; currentFilterInputId?: string } = {}
) => {
  const onEditFilter = props.onEditFilter ?? jest.fn();
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue(defaultActions);

  return {
    onEditFilter,
    ...render(
      <EuiThemeProvider>
        <ProjectPickerFilterDisplay
          onEditFilter={onEditFilter}
          currentFilterInputId={props.currentFilterInputId}
        />
      </EuiThemeProvider>
    ),
  };
};

describe('ProjectPickerFilterDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when there are no filter expressions', () => {
    const { container } = renderComponent();

    expect(container.firstChild).toBeNull();
  });

  it('should render the filter display container when filters are applied', () => {
    renderComponent({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    });

    expect(screen.getByTestId('projectPickerFilterDisplayContainer')).toBeInTheDocument();
  });

  it('should render a badge for each applied filter expression', () => {
    renderComponent({
      filterExpressions: createFilterExpressions([[typeSecurityExpression], [envProdExpression]]),
      selectedProjects: ['p1'],
    });

    expect(screen.getByText('_type:security')).toBeInTheDocument();
    expect(screen.getByText('env:prod')).toBeInTheDocument();
  });

  it('should open the filter badge context menu when a filter badge is clicked', async () => {
    const user = userEvent.setup();

    renderComponent({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      selectedProjects: ['p1'],
    });

    await user.click(screen.getByText('_type:security'));

    expect(screen.getByLabelText('Filter actions')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Convert to exclusion')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('should call onEditFilter with the selected filter when Edit is chosen from the context menu', async () => {
    const user = userEvent.setup();
    const { onEditFilter } = renderComponent({
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      selectedProjects: ['p1'],
    });

    await user.click(screen.getByText('_type:security'));
    await user.click(screen.getByText('Edit'));

    expect(onEditFilter).toHaveBeenCalledWith({
      id: typeSecurityKey,
      expression: typeSecurityExpression,
    });
  });

  describe('read-only mode', () => {
    it('renders filter badge text without interactive controls', async () => {
      const user = userEvent.setup();

      renderComponent({
        isReadOnly: true,
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      expect(screen.getByText('_type:security')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove filter' })).not.toBeInTheDocument();

      await user.click(screen.getByText('_type:security'));

      expect(screen.queryByLabelText('Filter actions')).not.toBeInTheDocument();
    });
  });

  describe('inactive filters', () => {
    it('keeps the badge clickable when the filter is disabled', async () => {
      const user = userEvent.setup();

      renderComponent({
        filterExpressions: createFilterExpressions([[typeSecurityExpression, false]]),
        selectedProjects: ['p1'],
      });

      expect(screen.getByRole('button', { name: 'Remove filter' })).toBeInTheDocument();

      await user.click(screen.getByText('_type:security'));

      expect(screen.getByLabelText('Filter actions')).toBeInTheDocument();
      expect(screen.getByText('Enable')).toBeInTheDocument();
      expect(screen.queryByText('Disable')).not.toBeInTheDocument();
    });
  });

  describe('filter currently being edited', () => {
    it('renders the matching badge without interactive controls', async () => {
      const user = userEvent.setup();

      renderComponent(
        {
          filterExpressions: createFilterExpressions([
            [typeSecurityExpression],
            [envProdExpression],
          ]),
          selectedProjects: ['p1'],
        },
        { currentFilterInputId: typeSecurityKey }
      );

      expect(screen.getByText('_type:security')).toBeInTheDocument();
      expect(screen.getByText('env:prod')).toBeInTheDocument();
      // Only the non-editing badge keeps a remove control.
      expect(screen.getAllByRole('button', { name: 'Remove filter' })).toHaveLength(1);

      await user.click(screen.getByText('_type:security'));

      expect(screen.queryByLabelText('Filter actions')).not.toBeInTheDocument();

      await user.click(screen.getByText('env:prod'));

      expect(screen.getByLabelText('Filter actions')).toBeInTheDocument();
    });
  });
});
