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
import { ProjectPickerFrameBody } from './body';
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

  describe('standard mode', () => {
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

  describe('read-only mode', () => {
    it('hides the filter box when there are no filter expressions', () => {
      renderBody({ isReadOnly: true });

      expect(screen.queryByTestId('projectPickerFilterDisplayContainer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeDisabled();
      expect(screen.getByTestId('bodyChild')).toBeInTheDocument();
    });

    it('shows filter display but not the add-filter control when filters are applied', () => {
      renderBody({
        isReadOnly: true,
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      });

      expect(screen.getByTestId('projectPickerFilterDisplayContainer')).toBeInTheDocument();
      expect(screen.queryByTestId('projectPickerFilterDisplayAddFilterBtn')).toBeDisabled();
      expect(screen.getByTestId('bodyChild')).toBeInTheDocument();
    });
  });
});
