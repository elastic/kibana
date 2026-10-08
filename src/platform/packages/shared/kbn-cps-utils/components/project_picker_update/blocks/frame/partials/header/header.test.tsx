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

import type { ProjectPickerState } from '../../../../state/reducers';
import { ProjectPickerFrameHeader } from './header';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../../../../utils/filter_input_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const mockUseProjectPickerState = jest.fn();
const mockUseProjectPickerActions = jest.fn();

jest.mock('../../../../state', () => ({
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

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const filterExpressions = overrides.filterExpressions ?? new Map();

  return {
    filterExpressions,
    filteringDimensions: [],
    availableProjects: new Map(),
    excludedOverrides: [],
    proposedFilters: null,
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjectIds: [],
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    displayedFilterExpressions: filterExpressions,
    isFilterProposalPending: false,
    controlsState: 'enabled',
    ...overrides,
  };
};

const defaultActions = {
  clearProjectFilters: jest.fn(),
  revertToSpaceDefaults: jest.fn(),
};

const renderHeader = (stateOverrides: Partial<ProjectPickerState> = {}) => {
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue(defaultActions);

  return render(
    <EuiThemeProvider>
      <ProjectPickerFrameHeader />
    </EuiThemeProvider>
  );
};

const openGlobalActionsMenu = async () => {
  const user = userEvent.setup();
  const [menuButton] = screen.getAllByRole('button');
  await user.click(menuButton);
};

describe('ProjectPickerFrameHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const stateWithFilters = {
    filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
    excludedOverrides: ['p2'],
  };

  describe('controlsState', () => {
    it('disables clear and revert menu items when controlsState is `disabled`', async () => {
      renderHeader({ ...stateWithFilters, controlsState: 'disabled' });
      await openGlobalActionsMenu();

      expect(screen.getByText('Clear project tag filters').closest('button')).toBeDisabled();
      expect(screen.getByText('Revert to space defaults').closest('button')).toBeDisabled();
    });

    it('enables clear and revert menu items when controlsState is `enabled`', async () => {
      renderHeader({ ...stateWithFilters, controlsState: 'enabled' });
      await openGlobalActionsMenu();

      expect(screen.getByText('Clear project tag filters').closest('button')).not.toBeDisabled();
      expect(screen.getByText('Revert to space defaults').closest('button')).not.toBeDisabled();
    });
  });

  describe('propose-then-commit filter state', () => {
    it('disables clear and revert menu items while a filter proposal is pending, even with filters displayed', async () => {
      renderHeader({
        ...stateWithFilters,
        proposedFilters: { filterExpressions: new Map(), excludedOverrides: [] },
        isFilterProposalPending: true,
      });
      await openGlobalActionsMenu();

      expect(screen.getByText('Clear project tag filters').closest('button')).toBeDisabled();
      expect(screen.getByText('Revert to space defaults').closest('button')).toBeDisabled();
    });

    it('reads displayedFilterExpressions (not the committed filters) for the clear-filters disabled check', async () => {
      renderHeader({
        filterExpressions: new Map(),
        displayedFilterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });
      await openGlobalActionsMenu();

      expect(screen.getByText('Clear project tag filters').closest('button')).not.toBeDisabled();
    });
  });
});
