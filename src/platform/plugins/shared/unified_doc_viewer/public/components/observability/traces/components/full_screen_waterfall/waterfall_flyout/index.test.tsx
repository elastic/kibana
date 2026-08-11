/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaterfallFlyout, type Props } from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { FlyoutContentId } from '../../../common/constants';
import { setUnifiedDocViewerServices } from '../../../../../../plugin';
import { mockUnifiedDocViewerServices } from '../../../../../../__mocks__';
import { OriginDocTypeContext } from '../../../../../doc_viewer_flyout/origin_doc_type_context';
import { GENAI_EBT_CLICK_ACTIONS } from '@kbn/apm-ui-shared';
import { TRACES_DOC_VIEWER_EBT_ELEMENTS } from '../../../ebt_constants';

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

jest.mock('../../../../../doc_viewer_table', () => ({
  __esModule: true,
  default: ({ hit, dataView }: any) => (
    <div data-test-subj="docViewerTable" data-hit-id={hit?.id}>
      Doc Viewer Table Mock
    </div>
  ),
}));

jest.mock('../../../../../doc_viewer_source', () => ({
  __esModule: true,
  default: ({ id, index, dataView }: any) => (
    <div data-test-subj="docViewerSource" data-id={id} data-index={index}>
      Doc Viewer Source Mock
    </div>
  ),
}));

jest.mock('../../../doc_viewer_genai', () => ({
  __esModule: true,
  DocViewerObsTracesGenAi: ({ hit }: any) => (
    <div data-test-subj="docViewerGenAi" data-hit-id={hit?.id}>
      Doc Viewer GenAI Mock
    </div>
  ),
  default: () => null,
}));

describe('WaterfallFlyout', () => {
  const mockHit = buildDataTableRecord(
    {
      _id: 'test-doc-id',
      _index: 'test-index',
      _source: {
        '@timestamp': '2023-01-01T00:00:00.000Z',
        message: 'test message',
      },
    },
    dataViewMock
  );

  const defaultProps: Props = {
    title: 'Test Flyout Title',
    onCloseFlyout: jest.fn(),
    hit: mockHit,
    loading: false,
    dataView: dataViewMock,
    flyoutContentId: FlyoutContentId.SPAN_DETAIL,
    children: <div data-test-subj="customChildren">Custom Children Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should display skeleton when loading', () => {
      render(<WaterfallFlyout {...defaultProps} loading={true} />);

      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewerWaterfallFlyoutNotFound')
      ).not.toBeInTheDocument();
    });
  });

  describe('not found state', () => {
    it('should display the not found empty prompt when the fetch finishes with no hit', () => {
      render(<WaterfallFlyout {...defaultProps} hit={null} loading={false} />);

      expect(screen.getByTestId('unifiedDocViewerWaterfallFlyoutNotFound')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewerWaterfallFlyoutFetchError')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
    });
  });

  describe('fetch error state', () => {
    it('should display the fetch error empty prompt with the error message when no hit and an error is set', () => {
      render(
        <WaterfallFlyout {...defaultProps} hit={null} loading={false} error="Boom: timeout" />
      );

      expect(screen.getByTestId('unifiedDocViewerWaterfallFlyoutFetchError')).toBeInTheDocument();
      expect(screen.getByText('Boom: timeout')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewerWaterfallFlyoutNotFound')
      ).not.toBeInTheDocument();
    });

    it('should still render the tabs when a hit is present even if error is set', () => {
      render(<WaterfallFlyout {...defaultProps} loading={false} error="Refetch failed" />);

      expect(screen.getByTestId('customChildren')).toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewerWaterfallFlyoutFetchError')
      ).not.toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('should display Overview tab by default', () => {
      render(<WaterfallFlyout {...defaultProps} />);

      expect(screen.getByTestId('customChildren')).toBeInTheDocument();
    });

    it('should display table view when switching to Table tab', async () => {
      render(<WaterfallFlyout {...defaultProps} />);

      fireEvent.click(screen.getByText('Table'));

      await waitFor(() => {
        const docViewerTable = screen.getByTestId('docViewerTable');
        expect(docViewerTable).toHaveAttribute('data-hit-id', mockHit.id);
      });

      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
    });

    it('should display JSON view when switching to JSON tab', async () => {
      render(<WaterfallFlyout {...defaultProps} />);

      fireEvent.click(screen.getByText('JSON'));

      await waitFor(() => {
        const docViewerSource = screen.getByTestId('docViewerSource');
        expect(docViewerSource).toHaveAttribute('data-id', mockHit.id);
        expect(docViewerSource).toHaveAttribute('data-index', mockHit.raw._index);
      });

      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
    });
  });

  describe('GenAI tab', () => {
    const genAiHit = buildDataTableRecord(
      {
        _id: 'genai-doc-id',
        _index: 'test-index',
        _source: {
          '@timestamp': '2023-01-01T00:00:00.000Z',
          attributes: { 'gen_ai.request.model': 'gpt-4o' },
        },
      },
      dataViewMock
    );

    it('does not show the GenAI tab for documents without gen_ai fields', () => {
      render(<WaterfallFlyout {...defaultProps} />);

      expect(screen.queryByTestId('unifiedDocViewerTracesGenAiTab')).not.toBeInTheDocument();
    });

    it('shows the GenAI tab and renders its content for documents with gen_ai fields', async () => {
      render(<WaterfallFlyout {...defaultProps} hit={genAiHit} />);

      const genAiTab = screen.getByTestId('unifiedDocViewerTracesGenAiTab');
      expect(genAiTab).toBeInTheDocument();

      fireEvent.click(genAiTab);

      await waitFor(() => {
        expect(screen.getByTestId('docViewerGenAi')).toHaveAttribute('data-hit-id', genAiHit.id);
      });
      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
    });

    it('adds the viewGenAi EBT click attributes to the GenAI tab', () => {
      render(<WaterfallFlyout {...defaultProps} hit={genAiHit} />);

      const genAiTab = screen.getByTestId('unifiedDocViewerTracesGenAiTab');
      expect(genAiTab).toHaveAttribute('data-ebt-action', GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI);
      expect(genAiTab).toHaveAttribute(
        'data-ebt-element',
        TRACES_DOC_VIEWER_EBT_ELEMENTS.FLYOUT_TABS
      );
    });

    it('falls back to the Overview tab when switching to a document without gen_ai fields', async () => {
      const { rerender } = render(<WaterfallFlyout {...defaultProps} hit={genAiHit} />);

      fireEvent.click(screen.getByTestId('unifiedDocViewerTracesGenAiTab'));
      await waitFor(() => {
        expect(screen.getByTestId('docViewerGenAi')).toBeInTheDocument();
      });

      rerender(<WaterfallFlyout {...defaultProps} hit={mockHit} />);

      await waitFor(() => {
        expect(screen.getByTestId('customChildren')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('unifiedDocViewerTracesGenAiTab')).not.toBeInTheDocument();
    });
  });

  describe('flyout header', () => {
    it('should display the title in the header', () => {
      render(<WaterfallFlyout {...defaultProps} title="Custom Title" />);

      expect(screen.getByRole('heading', { name: 'Custom Title' })).toBeInTheDocument();
    });

    it('should apply the provided flyout data-test-subj', () => {
      render(<WaterfallFlyout {...defaultProps} dataTestSubj="traceWaterfallDocumentFlyout" />);

      expect(screen.getByTestId('traceWaterfallDocumentFlyout')).toHaveAttribute(
        'data-test-subj',
        'traceWaterfallDocumentFlyout'
      );
    });
  });

  describe('close behavior', () => {
    it('should call onCloseFlyout when close button is clicked', () => {
      const onCloseFlyout = jest.fn();
      render(<WaterfallFlyout {...defaultProps} onCloseFlyout={onCloseFlyout} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onCloseFlyout).toHaveBeenCalledTimes(1);
    });
  });

  describe('originDocType telemetry', () => {
    it('forwards the parent OriginDocTypeContext value into the unified_doc_viewer_viewed event', () => {
      const reportEvent = mockUnifiedDocViewerServices.analytics.reportEvent as jest.Mock;
      reportEvent.mockClear();

      render(
        <OriginDocTypeContext.Provider value="log">
          <WaterfallFlyout {...defaultProps} flyoutContentId={FlyoutContentId.SPAN_DETAIL} />
        </OriginDocTypeContext.Provider>
      );

      expect(reportEvent).toHaveBeenCalledWith(
        'unified_doc_viewer_viewed',
        expect.objectContaining({
          originDocType: 'log',
          contentId: FlyoutContentId.SPAN_DETAIL,
        })
      );
    });
  });
});
