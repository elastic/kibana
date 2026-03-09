/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { render, screen } from '@testing-library/react';
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
  ContentFrameworkSection: ({ children, ...rest }: any) => (
    <div data-test-subj="contentFrameworkSection" {...rest}>
      {children}
    </div>
  ),
}));

const mockFullScreenWaterfall = jest.fn(
  ({ activeFlyoutType, docId }: Pick<FullScreenWaterfallProps, 'activeFlyoutType' | 'docId'>) => (
    <div
      data-test-subj="fullScreenWaterfall"
      data-active-flyout-type={activeFlyoutType ?? ''}
      data-doc-id={docId ?? ''}
    >
      FullScreenWaterfall
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
              if (id === 'observability-full-trace-waterfall') {
                return {
                  render: () => <div data-test-subj="fullTraceWaterfall">FullTraceWaterfall</div>,
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
        activeFlyoutType: 'spanDetailFlyout',
        activeDocId: 'span-1',
      };

      render(<TraceWaterfall {...defaultProps} traceId="trace-A" initialState={initialState} />);

      expect(screen.queryByTestId('fullScreenWaterfall')).not.toBeInTheDocument();
    });

    it('preserves legacy restored state when initialState has no restoredTraceId', async () => {
      const initialState: Partial<TraceWaterfallRestorableState> = {
        showFullScreenWaterfall: true,
        activeFlyoutType: 'spanDetailFlyout',
        activeDocId: 'transaction-doc-1',
      };

      render(<TraceWaterfall {...defaultProps} traceId="trace-A" initialState={initialState} />);

      expect(await screen.findByTestId('fullScreenWaterfall')).toBeInTheDocument();
      expect(screen.getByTestId('fullScreenWaterfall')).toHaveAttribute(
        'data-active-flyout-type',
        'spanDetailFlyout'
      );
      expect(screen.getByTestId('fullScreenWaterfall')).toHaveAttribute(
        'data-doc-id',
        'transaction-doc-1'
      );
    });
  });
});
