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
    });

    it('should display skeleton when hit is unavailable', () => {
      render(<WaterfallFlyout {...defaultProps} hit={null} />);

      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
      expect(screen.queryByTestId('customChildren')).not.toBeInTheDocument();
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

  describe('flyout header', () => {
    it('should display the title in the header', () => {
      render(<WaterfallFlyout {...defaultProps} title="Custom Title" />);

      expect(screen.getByRole('heading', { name: 'Custom Title' })).toBeInTheDocument();
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
});
