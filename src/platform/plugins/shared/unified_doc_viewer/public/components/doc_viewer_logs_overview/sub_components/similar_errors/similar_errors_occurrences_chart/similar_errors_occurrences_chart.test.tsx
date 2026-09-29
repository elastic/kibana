/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedClass } from 'vitest';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SimilarErrorsOccurrencesChart } from '.';
import { esql } from '@elastic/esql';
import { setUnifiedDocViewerServices } from '../../../../../plugin';
import { mockUnifiedDocViewerServices } from '../../../../../__mocks__';
import { merge } from 'lodash';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';

const NULLIFY_HEADER = 'SET unmapped_fields = "NULLIFY";';

const mockUseDataSourcesContext = vi.fn(() => ({
  indexes: { logs: 'logs-*', apm: {} },
  profileId: 'test-profile',
}));

vi.mock('../../../../../hooks/use_data_sources', () => {
      const mocked = {
      useDataSourcesContext: () => mockUseDataSourcesContext(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../content_framework/chart', () => {
      const mocked = {
      ContentFrameworkChart: ({ children, title, ...rest }: any) => (
        <div data-test-subj="ContentFrameworkChart" {...rest}>
          <h3>{title}</h3>
          {children}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

let capturedGetParentApi: (() => any) | undefined;

vi.mock('@kbn/embeddable-plugin/public', async () => {
  const original = (await vi.importActual('@kbn/embeddable-plugin/public'));
  return {
    ...original,
    EmbeddableRenderer: ({ type, getParentApi }: any) => {
      capturedGetParentApi = getParentApi;
      return <div data-test-subj="lensEmbeddableSimilarErrorsChart">Lens Chart (type: {type})</div>;
    },
  };
});

const mockBuild = vi.fn();

setUnifiedDocViewerServices(
  merge(mockUnifiedDocViewerServices, {
    data: {
      query: {
        timefilter: {
          timefilter: {
            getTime: vi.fn(() => ({ from: 'now-15m', to: 'now' })),
          },
        },
      },
      dataViews: {
        get: vi.fn(),
      },
    },
  })
);

vi.mock('@kbn/lens-embeddable-utils', () => {
  return {
    LensConfigBuilder: vi.fn().mockImplementation(() => ({
      build: mockBuild,
    })),
  };
});

const LensConfigBuilderMock = LensConfigBuilder as MockedClass<typeof LensConfigBuilder>;

describe('SimilarErrorsOccurrencesChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedGetParentApi = undefined;
    mockUseDataSourcesContext.mockReturnValue({
      indexes: { logs: 'logs-*', apm: {} },
      profileId: 'test-profile',
    });
    mockBuild.mockResolvedValue({
      visualizationType: 'lnsXY',
      state: {},
      attributes: {
        visualizationType: 'lnsXY',
        state: {},
      },
    } as any);
  });

  it('constructs ESQL query with stats and sort', async () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(LensConfigBuilderMock).toHaveBeenCalled();
    });

    const buildCall = mockBuild.mock.calls[0];
    const lensConfig = buildCall[0];
    const esqlQuery = lensConfig.dataset.esql;

    expect(esqlQuery.startsWith(NULLIFY_HEADER)).toBe(true);
    expect(esqlQuery).toContain('FROM logs-*');
    expect(esqlQuery).toContain('STATS');
    expect(esqlQuery).toContain('occurrences = COUNT(*)');
    expect(esqlQuery).toContain('BUCKET(@timestamp');
    expect(esqlQuery).toContain('SORT @timestamp');
  });

  it('shows loading state initially', () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    expect(screen.getByTestId('similarErrorsOccurrencesChartLoading')).toBeInTheDocument();
  });

  it('renders chart when attributes are built successfully', async () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(screen.getByTestId('lensEmbeddableSimilarErrorsChart')).toBeInTheDocument();
    });

    expect(screen.getByText('Lens Chart (type: vis)')).toBeInTheDocument();
  });

  it('shows error message when build fails', async () => {
    mockBuild.mockRejectedValueOnce(new Error('Build failed'));
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(screen.getByText('An error occurred while fetching chart data.')).toBeInTheDocument();
    });
  });

  it('does not build chart when baseEsqlQuery is undefined', async () => {
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={undefined} />);

    await waitFor(() => {
      expect(LensConfigBuilderMock).not.toHaveBeenCalled();
      expect(mockBuild).not.toHaveBeenCalled();
      expect(screen.queryByTestId('lensEmbeddableSimilarErrorsChart')).not.toBeInTheDocument();
    });
  });

  it('does not build chart when indexes.logs is undefined', async () => {
    mockUseDataSourcesContext.mockReturnValueOnce({
      indexes: { logs: undefined, apm: {} } as any,
      profileId: 'test-profile',
    });
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(LensConfigBuilderMock).not.toHaveBeenCalled();
      expect(mockBuild).not.toHaveBeenCalled();
      expect(screen.queryByTestId('lensEmbeddableSimilarErrorsChart')).not.toBeInTheDocument();
    });
  });

  it('adds annotation layer when currentDocumentTimestamp is provided', async () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    const timestamp = '2024-01-15T10:30:00Z';
    render(
      <SimilarErrorsOccurrencesChart
        baseEsqlQuery={baseQuery}
        currentDocumentTimestamp={timestamp}
      />
    );

    await waitFor(() => {
      expect(mockBuild).toHaveBeenCalled();
    });

    const lensConfig = mockBuild.mock.calls[0][0];
    const layers = lensConfig.layers;

    expect(layers.length).toBeGreaterThan(1);
    const annotationLayer = layers.find((layer: any) => layer.type === 'annotation');
    expect(annotationLayer.events[0].datetime).toBe(timestamp);
    expect(annotationLayer.events[0].name).toBe('Current document');
  });

  it('passes time_range in serialized state so Lens can resolve ?_tstart/?_tend', async () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(capturedGetParentApi).toBeDefined();
    });

    const serializedState = capturedGetParentApi!().getSerializedStateForChild();
    expect(serializedState.time_range).toEqual({ from: 'now-15m', to: 'now' });
    expect(serializedState).not.toHaveProperty('esqlVariables');
  });

  it('does not add annotation layer when currentDocumentTimestamp is not provided', async () => {
    const baseQuery = esql.exp`${esql.col(['service', 'name'])} == ${esql.str('test-service')}`;
    render(<SimilarErrorsOccurrencesChart baseEsqlQuery={baseQuery} />);

    await waitFor(() => {
      expect(mockBuild).toHaveBeenCalled();
    });

    const lensConfig = mockBuild.mock.calls[0][0];
    const layers = lensConfig.layers;

    const annotationLayer = layers.find((layer: any) => layer.type === 'annotation');
    expect(annotationLayer).toBeUndefined();
  });
});
