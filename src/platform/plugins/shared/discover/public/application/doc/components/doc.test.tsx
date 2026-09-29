/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

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
const mockSearchApi = vi.fn();

vi.mock('@kbn/unified-doc-viewer-plugin/public', () => {
      const mocked = {
      useEsDocSearch: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseDocSearch = vi.mocked(useEsDocSearch);

vi.mock('./single_doc_viewer', () => {
      const mocked = {
      SingleDocViewer: () => <div data-test-subj="singleDocViewerMock" />,
    };
      return { ...mocked, default: mocked };
    });

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
    vi.clearAllMocks();
  });

  it('renders Loading msg', () => {
    mockUseDocSearch.mockReturnValue([ElasticRequestState.Loading, null, vi.fn()]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeVisible();
    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeVisible();
    expect(screen.getByText(/loading…/i)).toBeVisible();
  });

  it('renders NotFound msg', () => {
    mockUseDocSearch.mockReturnValue([ElasticRequestState.NotFound, null, vi.fn()]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeVisible();
    expect(screen.getByText(/cannot find document/i)).toBeVisible();
    expect(screen.getByText(/no documents match that ID./i)).toBeVisible();
  });

  it('renders NotFoundDataView msg', () => {
    mockUseDocSearch.mockReturnValue([ElasticRequestState.NotFoundDataView, null, vi.fn()]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeVisible();
    expect(screen.getByText(/no data view matches id/i)).toBeVisible();
  });

  it('renders Error msg', () => {
    mockUseDocSearch.mockReturnValue([ElasticRequestState.Error, null, vi.fn()]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeVisible();
    expect(screen.getByText(/cannot run search/i)).toBeVisible();
    expect(screen.getByText(`${INDEX_NAME} is missing.`)).toBeVisible();
    expect(screen.getByText(/please ensure the index exists./i)).toBeVisible();
  });

  it('renders elasticsearch hit', () => {
    mockUseDocSearch.mockReturnValue([
      ElasticRequestState.Found,
      getDataTableRecordMock(),
      vi.fn(),
    ]);

    setupDoc();

    expect(screen.getByText(/single document - #1/i)).toBeVisible();
    expect(screen.getByTestId('doc-hit')).toBeVisible();
    expect(screen.getByTestId('singleDocViewerMock')).toBeVisible();
  });
});
