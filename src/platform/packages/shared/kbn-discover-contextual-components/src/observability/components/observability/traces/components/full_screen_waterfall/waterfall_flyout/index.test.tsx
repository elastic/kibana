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
import { buildDataTableRecord } from '@kbn/discover-utils';

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

const dataViewMock = createStubDataView({
  spec: {
    id: 'data-view-mock',
    title: 'data-view-mock',
    timeFieldName: '@timestamp',
    fields: {
      '@timestamp': {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        searchable: true,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      message: {
        name: 'message',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
    },
  },
});

jest.mock('@kbn/unified-doc-viewer', () => ({
  __esModule: true,
  DocViewerTable: ({ hit }: any) => (
    <div data-test-subj="docViewerTable" data-hit-id={hit?.id}>
      Doc Viewer Table Mock
    </div>
  ),
  JsonCodeEditorCommon: ({ jsonValue }: any) => (
    <div data-test-subj="docViewerJson" data-json={jsonValue}>
      Doc Viewer JSON Mock
    </div>
  ),
}));

jest.mock('../../../../../../services', () => ({
  useUnifiedDocViewerServices: () => ({
    core: { docLinks: {} },
    uiSettings: {},
    storage: {},
    fieldFormats: {},
    toasts: {},
    fieldsMetadata: undefined,
  }),
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
        const docViewerJson = screen.getByTestId('docViewerJson');
        expect(docViewerJson).toBeInTheDocument();
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
