/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import {
  FullScreenWaterfall,
  type FullScreenWaterfallProps,
  EUI_FLYOUT_BODY_OVERFLOW_CLASS,
} from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

let capturedCallbacks: any = null;

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({ type, getParentApi, hidePanelChrome }: any) => {
    const api = getParentApi();
    capturedCallbacks = api.getSerializedStateForChild();

    return (
      <div
        data-test-subj="embeddableRenderer"
        data-type={type}
        data-hide-panel-chrome={hidePanelChrome}
      >
        Embeddable Renderer Mock
      </div>
    );
  },
}));

jest.mock('./waterfall_flyout/span_flyout', () => ({
  SpanFlyout: ({ traceId, spanId, _, activeSection }: any) => (
    <div
      data-test-subj="spanFlyout"
      data-trace-id={traceId}
      data-span-id={spanId}
      data-active-section={activeSection}
    />
  ),
  spanFlyoutId: 'spanFlyout',
}));

jest.mock('./waterfall_flyout/logs_flyout', () => ({
  LogsFlyout: ({ id, _ }: any) => <div data-test-subj="logsFlyout" data-id={id} />,
  logsFlyoutId: 'logsFlyout',
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

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallbacks = null;
  });

  it('should render APM trace waterfall embeddable with hidden chrome', () => {
    render(<FullScreenWaterfall {...defaultProps} />);

    const embeddable = screen.getByTestId('embeddableRenderer');
    expect(embeddable).toHaveAttribute('data-type', 'APM_TRACE_WATERFALL_EMBEDDABLE');
    expect(embeddable).toHaveAttribute('data-hide-panel-chrome', 'true');
  });

  it('should not display nested flyouts initially', () => {
    render(<FullScreenWaterfall {...defaultProps} />);

    expect(screen.queryByTestId('spanFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
  });

  describe('nested flyout interactions', () => {
    it('should display span details when clicking a waterfall node', () => {
      render(<FullScreenWaterfall {...defaultProps} />);

      act(() => {
        capturedCallbacks.onNodeClick('test-span-id');
      });

      const spanFlyout = screen.getByTestId('spanFlyout');
      expect(spanFlyout).toHaveAttribute('data-trace-id', 'test-trace-id');
      expect(spanFlyout).toHaveAttribute('data-span-id', 'test-span-id');
      expect(spanFlyout).not.toHaveAttribute('data-active-section');
      expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
    });

    it('should display span errors table when clicking an error with multiple occurrences', () => {
      render(<FullScreenWaterfall {...defaultProps} />);

      act(() => {
        capturedCallbacks.onErrorClick({
          traceId: 'test-trace-id',
          docId: 'test-error-doc-id',
          errorCount: 5,
        });
      });

      const spanFlyout = screen.getByTestId('spanFlyout');
      expect(spanFlyout).toHaveAttribute('data-active-section', 'errors-table');
      expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
    });

    it('should display log details when clicking a single error', () => {
      render(<FullScreenWaterfall {...defaultProps} />);

      act(() => {
        capturedCallbacks.onErrorClick({
          traceId: 'test-trace-id',
          docId: 'test-doc-id',
          errorCount: 1,
          errorDocId: 'test-error-log-id',
        });
      });

      expect(screen.getByTestId('logsFlyout')).toHaveAttribute('data-id', 'test-error-log-id');
      expect(screen.queryByTestId('spanFlyout')).not.toBeInTheDocument();
    });

    it('should not open any flyout when clicking a single error without errorDocId', () => {
      render(<FullScreenWaterfall {...defaultProps} />);

      act(() => {
        capturedCallbacks.onErrorClick({
          traceId: 'test-trace-id',
          docId: 'test-doc-id',
          errorCount: 1,
        });
      });

      expect(screen.queryByTestId('spanFlyout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
    });
  });

  describe('scrollElement integration', () => {
    it('should pass scrollElement with correct EUI class to embeddable', async () => {
      render(<FullScreenWaterfall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('embeddableRenderer')).toBeInTheDocument();
      });

      expect(capturedCallbacks.scrollElement).not.toBeNull();
      expect(capturedCallbacks.scrollElement).toBeInstanceOf(Element);
      expect(
        capturedCallbacks.scrollElement.classList.contains(EUI_FLYOUT_BODY_OVERFLOW_CLASS)
      ).toBe(true);
    });
  });
});
