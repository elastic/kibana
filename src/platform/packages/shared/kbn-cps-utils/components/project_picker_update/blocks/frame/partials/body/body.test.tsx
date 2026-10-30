/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import type { ProjectPickerState } from '../../../../state/reducers';
import { ProjectPickerFrameBody, ProjectPickerFrameBodyHeader } from './body';
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
    controlsState: 'enabled',
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
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
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    displayedFilterExpressions: filterExpressions,
    isFilterProposalPending: false,
    ...overrides,
  };
};

const renderBody = (stateOverrides: Partial<ProjectPickerState> = {}) => {
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue({});

  return render(
    <EuiThemeProvider>
      <ProjectPickerFrameBody>
        <div data-test-subj="bodyChild" />
      </ProjectPickerFrameBody>
    </EuiThemeProvider>
  );
};

const renderBodyHeader = (stateOverrides: Partial<ProjectPickerState> = {}) => {
  mockUseProjectPickerState.mockReturnValue(createState(stateOverrides));
  mockUseProjectPickerActions.mockReturnValue({});

  return render(
    <EuiThemeProvider>
      <ProjectPickerFrameBodyHeader />
    </EuiThemeProvider>
  );
};

const ProjectPickerFrameBodyWithScrollContainerRef = ({
  onRefAttached,
}: {
  onRefAttached: (node: HTMLDivElement | null) => void;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onRefAttached(scrollContainerRef.current);
  }, [onRefAttached]);

  return (
    <EuiThemeProvider>
      <ProjectPickerFrameBody scrollContainerRef={scrollContainerRef}>
        <div data-test-subj="bodyChild" />
      </ProjectPickerFrameBody>
    </EuiThemeProvider>
  );
};

describe('ProjectPickerFrameBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enabled controls state', () => {
    it('shows the add-filter control when filters are applied', () => {
      renderBody({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      expect(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeInTheDocument();
    });

    it('shows the add-filter control when there are no filters applied', () => {
      renderBody({
        filterExpressions: new Map(),
      });

      expect(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeInTheDocument();
    });

    it('attaches a passed-in scrollContainerRef to the scrollable container element', () => {
      mockUseProjectPickerState.mockReturnValue(createState());
      mockUseProjectPickerActions.mockReturnValue({});
      const onRefAttached = jest.fn();

      render(<ProjectPickerFrameBodyWithScrollContainerRef onRefAttached={onRefAttached} />);

      expect(onRefAttached).toHaveBeenCalledWith(expect.any(HTMLDivElement));
      const [[attachedNode]] = onRefAttached.mock.calls;
      expect(attachedNode).toContainElement(screen.getByTestId('bodyChild'));
    });
  });

  describe('disabled controls state', () => {
    it('hides the filter box when there are no filter expressions', () => {
      renderBody({ controlsState: 'disabled' });

      expect(screen.queryByTestId('projectPickerFilterDisplayContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeDisabled();
      expect(screen.getByTestId('bodyChild')).toBeInTheDocument();
    });

    it('shows filter display but not the add-filter control when filters are applied', () => {
      renderBody({
        controlsState: 'disabled',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      expect(screen.getByTestId('projectPickerFilterDisplayContainer')).toBeInTheDocument();
      expect(screen.queryByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeDisabled();
      expect(screen.getByTestId('bodyChild')).toBeInTheDocument();
    });
  });

  describe('hidden controls state', () => {
    it('hides the entire header when controls are hidden', () => {
      renderBody({ controlsState: 'hidden' });

      expect(screen.queryByTestId('projectPickerFrameBodyHeader')).not.toBeInTheDocument();
      expect(screen.getByTestId('bodyChild')).toBeInTheDocument();
    });
  });

  describe('propose-then-commit filter state', () => {
    it('shows the no-matching-projects warning when committed filters exclude every project', () => {
      renderBodyHeader({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        visibleProjectIds: [],
        selectedProjectIds: [],
      });

      expect(screen.getByTestId('projectPickerFilterDisplayNoMatchCallout')).toBeInTheDocument();
    });

    it('suppresses the no-matching-projects warning while a filter proposal is pending', () => {
      renderBodyHeader({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        visibleProjectIds: [],
        selectedProjectIds: [],
        proposedFilters: { filterExpressions: new Map(), excludedOverrides: [] },
        isFilterProposalPending: true,
      });

      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();
    });

    it('shows the search-error callout when the pending proposal failed, without the no-match warning', () => {
      renderBodyHeader({
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        visibleProjectIds: [],
        selectedProjectIds: [],
        proposedFilters: {
          filterExpressions: createFilterExpressions([[typeSecurityExpression, false]]),
          excludedOverrides: [],
        },
        isFilterProposalPending: true,
        filterSearchError: new Error('search failed'),
      });

      expect(screen.getByTestId('projectPickerFilterSearchErrorCallout')).toBeInTheDocument();
      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();
    });

    it('renders the displayed (proposed) filter chips instead of the committed ones while a proposal is pending', () => {
      const proposedFilterExpressions = createFilterExpressions([[typeSecurityExpression]]);

      renderBodyHeader({
        filterExpressions: new Map(),
        displayedFilterExpressions: proposedFilterExpressions,
        proposedFilters: { filterExpressions: proposedFilterExpressions, excludedOverrides: [] },
        isFilterProposalPending: true,
      });

      expect(screen.getByTestId('projectPickerFilterDisplayContainer')).toBeInTheDocument();
    });

    it('disables the add-filter control while a proposal is pending', () => {
      renderBodyHeader({ isFilterProposalPending: true });

      expect(screen.getByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeDisabled();
    });
  });
});
