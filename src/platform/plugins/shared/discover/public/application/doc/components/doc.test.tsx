/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/types';
import React from 'react';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverTestProvider } from '../../../__mocks__/test_provider';
import { Doc } from './doc';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { getDataTableRecordMock } from '@kbn/discover-utils/src/__mocks__';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { render, screen } from '@testing-library/react';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';

const INDEX_NAME = 'index1';
const services = createDiscoverServicesMock();
const mockSearchApi = jest.fn();

jest.mock('@kbn/unified-doc-viewer-plugin/public', () => ({
  useEsDocSearch: jest.fn(),
}));

jest.mock('./single_doc_viewer', () => ({
  SingleDocViewer: () => <div data-test-subj="singleDocViewerMock" />,
}));

function setupDoc() {
  setUnifiedDocViewerServices({
    ...mockUnifiedDocViewerServices,
    data: {
      search: {
        search: mockSearchApi,
      },
    },
  } as unknown as UnifiedDocViewerServices);

  return render(
    <DiscoverTestProvider services={services}>
      <Doc dataView={dataViewMock} id="1" index={INDEX_NAME} referrer="mock-referrer" />
    </DiscoverTestProvider>
  );
}

describe('Test of <Doc /> of Discover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Loading msg', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Loading, null]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
  });

  it('renders NotFound msg', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot find document/i)).toBeInTheDocument();
    expect(screen.getByText(/no documents match that ID./i)).toBeInTheDocument();
  });

  it('renders NotFoundDataView msg', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFoundDataView, null]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeInTheDocument();
    expect(screen.getByText(/no data view matches id/i)).toBeInTheDocument();
  });

  it('renders Error msg', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Error, null]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot run search/i)).toBeInTheDocument();
    expect(screen.getByText(`${INDEX_NAME} is missing.`)).toBeInTheDocument();
    expect(screen.getByText(/please ensure the index exists./i)).toBeInTheDocument();
  });

  it('renders elasticsearch hit', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      getDataTableRecordMock(),
    ]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeInTheDocument();
    expect(screen.getByTestId('doc-hit')).toBeInTheDocument();
    expect(screen.getByTestId('singleDocViewerMock')).toBeInTheDocument();
  });
});
