/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TraceWaterfall } from '.';
import { setUnifiedDocViewerServices } from '../../../../../plugin';
import type { UnifiedDocViewerServices } from '../../../../../types';
import type { TraceWaterfallRestorableState } from '.';
import type { FullScreenWaterfallProps } from '../full_screen_waterfall';

jest.mock('../../../../../hooks/use_data_sources', () => ({
  useDataSourcesContext: () => ({
    indexes: { apm: { traces: 'apm-traces-*' } },
  }),
}));

jest.mock('../../../../../hooks/use_discover_link_and_esql_query', () => ({
  useDiscoverLinkAndEsqlQuery: () => ({
    discoverUrl: 'http://localhost/discover',
    esqlQueryString: 'FROM traces',
  }),
}));

jest.mock('../../../../../hooks/use_open_in_discover_section_action', () => ({
  useOpenInDiscoverSectionAction: () => null,
}));

jest.mock('./full_screen_waterfall_tour_step', () => ({
  TraceWaterfallTourStep: () => null,
}));

jest.mock('../../../../content_framework/lazy_content_framework_section', () => ({
  ContentFrameworkSection: ({ children, actions }: any) => (
    <div data-test-subj="contentFrameworkSection">
      {actions?.map((action: any, i: number) => (
        <button key={i} data-test-subj={action.dataTestSubj} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
      {children}
    </div>
  ),
}));

const mockFullScreenWaterfall = jest.fn(
  ({
    activeFlyoutType,
    docId,
    onExitFullScreen,
  }: Pick<FullScreenWaterfallProps, 'activeFlyoutType' | 'docId' | 'onExitFullScreen'>) => (
    <div
      data-test-subj="fullScreenWaterfall"
      data-active-flyout-type={activeFlyoutType ?? ''}
      data-doc-id={docId ?? ''}
    >
      <button data-test-subj="exitFullScreen" onClick={onExitFullScreen as any} />
    </div>
  )
);

jest.mock('../full_screen_waterfall', () => ({
  FullScreenWaterfall: (props: FullScreenWaterfallProps) => mockFullScreenWaterfall(props),
}));

jest.mock('@kbn/esql-composer', () => ({
  where: jest.fn(),
}));

describe('TraceWaterfall', () => {
  const defaultProps = {
    traceId: 'trace-A',
    docId: 'doc-1',
    serviceName: 'my-service',
    dataView: dataViewMock,
  };

  beforeAll(() => {
    setUnifiedDocViewerServices({
      data: {
        query: {
          timefilter: {
            timefilter: {
              getAbsoluteTime: () => ({ from: 'now-15m', to: 'now' }),
            },
          },
        },
      },
      discoverShared: {
        features: {
          registry: {
            getById: (id: string) => {
              if (id === 'observability-focused-trace-waterfall') {
                return {
                  render: () => (
                    <div data-test-subj="focusedTraceWaterfall">FocusedTraceWaterfall</div>
                  ),
                };
              }
              return undefined;
            },
          },
        },
      },
    } as unknown as UnifiedDocViewerServices);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the focused trace waterfall without docId', () => {
    render(<TraceWaterfall {...defaultProps} docId={undefined} />);

    expect(screen.getByTestId('focusedTraceWaterfall')).toBeInTheDocument();
  });

  it('renders the focused trace waterfall without serviceName', () => {
    render(<TraceWaterfall {...defaultProps} serviceName={undefined} />);

    expect(screen.getByTestId('focusedTraceWaterfall')).toBeInTheDocument();
  });

  it('renders the focused trace waterfall without docId and serviceName', () => {
    render(<TraceWaterfall {...defaultProps} docId={undefined} serviceName={undefined} />);

    expect(screen.getByTestId('focusedTraceWaterfall')).toBeInTheDocument();
  });

  describe('opening and closing', () => {
    it('opens FullScreenWaterfall when the waterfall area is clicked', () => {
      render(<TraceWaterfall {...defaultProps} />);

      expect(screen.queryByTestId('fullScreenWaterfall')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('unifiedDocViewerTraceSummaryTraceWaterfallClickArea'));
      expect(screen.getByTestId('fullScreenWaterfall')).toBeInTheDocument();
    });

    it('opens FullScreenWaterfall when the expand button is clicked', () => {
      render(<TraceWaterfall {...defaultProps} />);

      expect(screen.queryByTestId('fullScreenWaterfall')).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByTestId('unifiedDocViewerObservabilityTracesTraceFullScreenButton')
      );
      expect(screen.getByTestId('fullScreenWaterfall')).toBeInTheDocument();
    });

    it('closes FullScreenWaterfall when exit is triggered', () => {
      render(<TraceWaterfall {...defaultProps} />);

      fireEvent.click(screen.getByTestId('unifiedDocViewerTraceSummaryTraceWaterfallClickArea'));
      expect(screen.getByTestId('fullScreenWaterfall')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('exitFullScreen'));
      expect(screen.queryByTestId('fullScreenWaterfall')).not.toBeInTheDocument();
    });
  });

  describe('stale-state prevention', () => {
    it('renders the full-screen waterfall when initialState has a matching restoredTraceId', async () => {
      const initialState: Partial<TraceWaterfallRestorableState> = {
        restoredTraceId: 'trace-A',
        showFullScreenWaterfall: true,
      };

      render(<TraceWaterfall {...defaultProps} traceId="trace-A" initialState={initialState} />);

      expect(await screen.findByTestId('fullScreenWaterfall')).toBeInTheDocument();
    });

    it('does NOT render the full-screen waterfall when initialState has a mismatched restoredTraceId', () => {
      const initialState: Partial<TraceWaterfallRestorableState> = {
        restoredTraceId: 'trace-OTHER',
        showFullScreenWaterfall: true,
        activeFlyoutType: 'span',
        activeDocId: 'span-1',
      };

      render(<TraceWaterfall {...defaultProps} traceId="trace-A" initialState={initialState} />);

      expect(screen.queryByTestId('fullScreenWaterfall')).not.toBeInTheDocument();
    });

    it('preserves legacy restored state when initialState has no restoredTraceId', async () => {
      const initialState: Partial<TraceWaterfallRestorableState> = {
        showFullScreenWaterfall: true,
        activeFlyoutType: 'span',
        activeDocId: 'transaction-doc-1',
      };

      render(<TraceWaterfall {...defaultProps} traceId="trace-A" initialState={initialState} />);

      expect(await screen.findByTestId('fullScreenWaterfall')).toBeInTheDocument();
      expect(screen.getByTestId('fullScreenWaterfall')).toHaveAttribute(
        'data-active-flyout-type',
        'span'
      );
      expect(screen.getByTestId('fullScreenWaterfall')).toHaveAttribute(
        'data-doc-id',
        'transaction-doc-1'
      );
    });
  });
});
