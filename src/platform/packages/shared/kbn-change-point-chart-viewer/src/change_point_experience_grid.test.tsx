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
import {
  KibanaErrorBoundaryProvider,
  KibanaSectionErrorBoundary,
} from '@kbn/shared-ux-error-boundary';
import type { UnifiedHistogramFetchParams } from '@kbn/unified-histogram';
import { ChangePointExperienceGrid } from './change_point_experience_grid';

// The APM client is pulled in transitively by the error boundary package.
jest.mock('@elastic/apm-rum');

jest.mock('@kbn/unified-histogram', () => ({
  // Render children directly so we can test the grid content in isolation.
  ChartSectionTemplate: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/esql-utils', () => ({
  getChangePointSeriesColumns: jest.fn().mockReturnValue(undefined),
}));

jest.mock('./utils/derive_change_point_cards', () => ({
  buildChangePointCards: jest.fn().mockReturnValue([]),
}));

jest.mock('./utils/get_esql_query', () => ({
  getEsqlQuery: jest.fn().mockReturnValue('FROM logs-* | CHANGE_POINT count ON @timestamp'),
}));

jest.mock('./hooks/use_change_point_controls', () => ({
  useChangePointControls: jest.fn().mockReturnValue({
    displayedCards: [],
    currentPage: 0,
    setCurrentPage: jest.fn(),
    controlsNode: null,
  }),
}));

// Minimal fetchParams with only the fields the grid reads directly.
const fetchParams = {
  query: { esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp' },
  table: { columns: [], rows: [] },
  timeRange: { from: 'now-15m', to: 'now' },
  relativeTimeRange: { from: 'now-15m', to: 'now' },
  filters: [],
  esqlVariables: [],
} as unknown as UnifiedHistogramFetchParams;

const minimalProps = {
  services: {} as never,
  fetchParams,
  fetch$: {} as never,
  isComponentVisible: true,
  renderToggleActions: () => undefined,
};

/**
 * Mirrors the error boundary structure used in LazyChangePointExperienceGrid:
 *
 *   <KibanaErrorBoundaryProvider analytics={undefined}>
 *     <KibanaSectionErrorBoundary sectionName="Change point charts">
 *       <ChangePointExperienceGrid .../>
 *     </KibanaSectionErrorBoundary>
 *   </KibanaErrorBoundaryProvider>
 */
const renderWithBoundary = (props = minimalProps) =>
  render(
    <KibanaErrorBoundaryProvider analytics={undefined}>
      <KibanaSectionErrorBoundary sectionName="Change point charts">
        <ChangePointExperienceGrid {...props} />
      </KibanaSectionErrorBoundary>
    </KibanaErrorBoundaryProvider>
  );

describe('ChangePointExperienceGrid error boundary integration', () => {
  beforeEach(() => {
    // Suppress the expected React error-boundary console output so test output stays clean.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.requireMock('./utils/derive_change_point_cards').buildChangePointCards.mockReturnValue([]);
  });

  it('renders the grid without errors under normal conditions', () => {
    // buildChangePointCards returns [] by default → "No change points" empty-prompt branch.
    const { container } = renderWithBoundary();
    // The section error boundary UI must NOT be present.
    expect(screen.queryByTestId('sectionErrorBoundaryPromptHeader')).not.toBeInTheDocument();
    // Some DOM output must exist (the grid renders at minimum an empty container).
    expect(container.firstChild).not.toBeNull();
  });

  it('shows the section error boundary UI instead of crashing when buildChangePointCards throws', () => {
    // Simulate the kind of synchronous render-time crash the error boundary is there to catch
    // (e.g. malformed data, unexpected null reference inside a memoised helper).
    jest
      .requireMock('./utils/derive_change_point_cards')
      .buildChangePointCards.mockImplementation(() => {
        throw new Error('Simulated crash in buildChangePointCards');
      });

    renderWithBoundary();

    // The error boundary should have caught the throw and rendered its fallback heading.
    expect(screen.getByTestId('sectionErrorBoundaryPromptHeader')).toBeInTheDocument();
    // The normal grid output should not be present.
    expect(screen.queryByText('No change points detected.')).not.toBeInTheDocument();
  });
});
