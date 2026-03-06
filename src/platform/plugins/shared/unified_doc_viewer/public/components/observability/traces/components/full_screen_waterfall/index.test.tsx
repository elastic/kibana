/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { FullScreenWaterfall, type FullScreenWaterfallProps } from '.';
import { setUnifiedDocViewerServices } from '../../../../../plugin';
import type { UnifiedDocViewerServices } from '../../../../../types';

jest.mock('./waterfall_flyout/span_flyout', () => ({
  spanFlyoutId: 'spanDetailFlyout',
}));

jest.mock('./waterfall_flyout/logs_flyout', () => ({
  logsFlyoutId: 'logsFlyout',
}));

jest.mock('./waterfall_flyout/document_detail_flyout', () => ({
  DocumentDetailFlyout: ({ type, docId, traceId, activeSection, dataTestSubj }: any) => (
    <div
      data-test-subj={type === 'spanDetailFlyout' ? 'spanFlyout' : 'logsFlyout'}
      data-trace-id={traceId}
      data-span-id={docId}
      data-id={docId}
      data-active-section={activeSection}
      data-flyout-test-subj={dataTestSubj}
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
    docId: null,
    docIndex: undefined,
    activeFlyoutType: null,
    activeSection: undefined,
    onNodeClick: jest.fn(),
    onErrorClick: jest.fn(),
    onCloseFlyout: jest.fn(),
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.getElementById('flyout-skip-open-animation')?.remove();
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

  describe('animation suppression', () => {
    it('injects a style scoped to traceWaterfallFlyout when skipOpenAnimation is true', () => {
      render(<FullScreenWaterfall {...defaultProps} skipOpenAnimation={true} />);

      const style = document.getElementById('flyout-skip-open-animation');
      expect(style).toBeInTheDocument();
      expect(style!.textContent).toContain('[data-test-subj="traceWaterfallFlyout"]');
      expect(style!.textContent).toContain('[data-test-subj="traceWaterfallDocumentFlyout"]');
    });

    it('does not inject the animation-suppression style when skipOpenAnimation is false', () => {
      render(<FullScreenWaterfall {...defaultProps} skipOpenAnimation={false} />);

      expect(document.getElementById('flyout-skip-open-animation')).not.toBeInTheDocument();
    });

    it('removes the animation-suppression style after the timeout', () => {
      render(<FullScreenWaterfall {...defaultProps} skipOpenAnimation={true} />);

      expect(document.getElementById('flyout-skip-open-animation')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(document.getElementById('flyout-skip-open-animation')).not.toBeInTheDocument();
    });

    it('passes the nested flyout test subject to the restored document flyout', () => {
      render(
        <FullScreenWaterfall
          {...defaultProps}
          skipOpenAnimation={true}
          docId="transaction-doc-1"
          activeFlyoutType="spanDetailFlyout"
        />
      );

      expect(screen.getByTestId('spanFlyout')).toHaveAttribute(
        'data-flyout-test-subj',
        'traceWaterfallDocumentFlyout'
      );
    });
  });
});
