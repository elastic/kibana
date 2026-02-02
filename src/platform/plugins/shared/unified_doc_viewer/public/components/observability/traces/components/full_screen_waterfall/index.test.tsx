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
import { FullScreenWaterfall, type FullScreenWaterfallProps } from '.';
import { setUnifiedDocViewerServices } from '../../../../../plugin';
import type { UnifiedDocViewerServices } from '../../../../../types';

jest.mock('./waterfall_flyout/span_flyout', () => ({
  spanFlyoutId: 'spanFlyout',
}));

jest.mock('./waterfall_flyout/logs_flyout', () => ({
  logsFlyoutId: 'logsFlyout',
}));

jest.mock('./waterfall_flyout/document_detail_flyout', () => ({
  DocumentDetailFlyout: ({ type, docId, traceId, activeSection }: any) => (
    <div
      data-test-subj={type === 'spanFlyout' ? 'spanFlyout' : 'logsFlyout'}
      data-trace-id={traceId}
      data-span-id={docId}
      data-id={docId}
      data-active-section={activeSection}
    />
  ),
}));

describe('FullScreenWaterfall', () => {
  const defaultProps: FullScreenWaterfallProps = {
    traceId: 'test-trace-id',
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    dataView: dataViewMock,
    serviceName: 'test-service',
    onExitFullScreen: jest.fn(),
  };

  beforeAll(() => {
    setUnifiedDocViewerServices({
      discoverShared: {
        features: {
          registry: {
            getById: () => ({
              render: () => <div data-test-subj="fullTraceWaterfall">FullTraceWaterfall</div>,
            }),
          },
        },
      },
    } as unknown as UnifiedDocViewerServices);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not display nested flyouts initially', () => {
    render(<FullScreenWaterfall {...defaultProps} />);

    expect(screen.queryByTestId('spanFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
  });

  it('should display the full trace waterfall', () => {
    render(<FullScreenWaterfall {...defaultProps} />);

    expect(screen.getByTestId('fullTraceWaterfall')).toBeInTheDocument();
  });

  describe('when service name is undefined', () => {
    it('does not display the full trace waterfall', () => {
      render(<FullScreenWaterfall {...defaultProps} serviceName={undefined} />);

      expect(screen.queryByTestId('fullTraceWaterfall')).not.toBeInTheDocument();
    });
  });
});
