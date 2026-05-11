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
import { mockUnifiedDocViewerServices } from '../../../../../__mocks__';
import { FlyoutHistoryKeyContext } from '../../../../doc_viewer_flyout/flyout_history_key_context';

const testHistoryKey = Symbol('testHistoryKey');
const renderWithHistoryKey = (ui: React.ReactElement) =>
  render(
    <FlyoutHistoryKeyContext.Provider value={testHistoryKey}>{ui}</FlyoutHistoryKeyContext.Provider>
  );

jest.mock('./waterfall_flyout/span_flyout', () => ({
  spanFlyoutId: 'spanDetailFlyout',
}));

jest.mock('./waterfall_flyout/logs_flyout', () => ({
  logsFlyoutId: 'logsFlyout',
}));

let capturedDocFlyoutHasAnimation: boolean | undefined;

jest.mock('./waterfall_flyout/document_detail_flyout', () => ({
  DocumentDetailFlyout: ({
    type,
    docId,
    traceId,
    activeSection,
    dataTestSubj,
    hasAnimation,
  }: any) => {
    capturedDocFlyoutHasAnimation = hasAnimation;
    return (
      <div
        data-test-subj={type === 'spanDetailFlyout' ? 'spanFlyout' : 'logsFlyout'}
        data-trace-id={traceId}
        data-span-id={docId}
        data-id={docId}
        data-active-section={activeSection}
        data-flyout-test-subj={dataTestSubj}
      />
    );
  },
}));

let capturedWaterfallProps: {
  contextSpanIds?: string[];
  onNodeClick?: (id: string) => void;
  onErrorClick?: (params: any) => void;
} = {};

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
      ...mockUnifiedDocViewerServices,
      discoverShared: {
        features: {
          registry: {
            getById: () => ({
              render: (props: any) => {
                capturedWaterfallProps = props;
                return <div data-test-subj="fullTraceWaterfall">FullTraceWaterfall</div>;
              },
            }),
          },
        },
      },
    } as unknown as UnifiedDocViewerServices);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedWaterfallProps = {};
    capturedDocFlyoutHasAnimation = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not display nested flyouts initially', () => {
    renderWithHistoryKey(<FullScreenWaterfall {...defaultProps} />);

    expect(screen.queryByTestId('spanFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('logsFlyout')).not.toBeInTheDocument();
  });

  it('renders the full trace waterfall immediately on standard open', () => {
    renderWithHistoryKey(<FullScreenWaterfall {...defaultProps} />);

    expect(screen.getByTestId('fullTraceWaterfall')).toBeInTheDocument();
  });

  describe('when service name is undefined', () => {
    it('renders the full trace waterfall', () => {
      renderWithHistoryKey(<FullScreenWaterfall {...defaultProps} serviceName={undefined} />);

      expect(screen.getByTestId('fullTraceWaterfall')).toBeInTheDocument();
    });
  });

  describe('hasAnimation prop', () => {
    it('passes animation disabled to the document detail flyout when skipOpenAnimation is true', () => {
      renderWithHistoryKey(
        <FullScreenWaterfall
          {...defaultProps}
          skipOpenAnimation={true}
          docId="transaction-doc-1"
          activeFlyoutType="spanDetailFlyout"
        />
      );

      expect(capturedDocFlyoutHasAnimation).toBe(false);
    });

    it('passes animation enabled to the document detail flyout when skipOpenAnimation is false', () => {
      renderWithHistoryKey(
        <FullScreenWaterfall
          {...defaultProps}
          skipOpenAnimation={false}
          docId="transaction-doc-1"
          activeFlyoutType="spanDetailFlyout"
        />
      );

      expect(capturedDocFlyoutHasAnimation).toBe(true);
    });

    it('renders the document detail flyout with the correct test subject', () => {
      renderWithHistoryKey(
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

  describe('context span state management', () => {
    it('passes initial contextSpanIds to FullTraceWaterfall', () => {
      renderWithHistoryKey(
        <FullScreenWaterfall
          {...defaultProps}
          skipOpenAnimation={true}
          contextSpanIds={['initial-span']}
        />
      );

      expect(capturedWaterfallProps.contextSpanIds).toEqual(['initial-span']);
    });
  });
});
