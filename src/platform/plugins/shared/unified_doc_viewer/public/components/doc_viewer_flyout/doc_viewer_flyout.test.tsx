/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';
import { UnifiedDocViewerFlyout, type UnifiedDocViewerFlyoutProps } from './doc_viewer_flyout';

const buildHit = ({ id, message }: { id: string; message: string }) =>
  buildDataTableRecord(
    {
      _id: id,
      _index: 'logs-test-default',
      _source: {
        '@timestamp': '2023-01-01T00:00:00.000Z',
        message,
      },
    },
    dataViewMock
  );

const createUnifiedDocViewerServices = () => {
  const registry = new DocViewsRegistry();

  registry.add({
    id: 'test_doc_view',
    title: 'Test view',
    order: 10,
    render: () => <div data-test-subj="docViewerFlyoutTestView">Test view</div>,
  });

  return { ...mockUnifiedDocViewerServices, unifiedDocViewer: { registry } };
};

let unifiedDocViewerServices = createUnifiedDocViewerServices();

const buildProps = (
  overrides: Partial<UnifiedDocViewerFlyoutProps> = {}
): UnifiedDocViewerFlyoutProps => ({
  services: {
    toastNotifications: unifiedDocViewerServices.toasts,
    chrome: unifiedDocViewerServices.core.chrome,
  },
  isEsqlQuery: false,
  columns: [],
  hit: buildHit({ id: 'default-hit', message: 'default message' }),
  hits: undefined,
  dataView: dataViewMock,
  setExpandedDoc: jest.fn(),
  onClose: jest.fn(),
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
  ...overrides,
});

describe('UnifiedDocViewerFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unifiedDocViewerServices = createUnifiedDocViewerServices();
    setUnifiedDocViewerServices(unifiedDocViewerServices);
  });

  it('uses the refreshed hit from hits and shows pagination when the current hit is found', () => {
    const staleHit = buildHit({ id: 'shared-hit', message: 'stale message' });
    const unrelatedHit = buildHit({ id: 'other-hit', message: 'other message' });
    const refreshedHit = buildHit({ id: 'shared-hit', message: 'fresh message' });

    render(
      <UnifiedDocViewerFlyout
        {...buildProps({
          hit: staleHit,
          hits: [unrelatedHit, refreshedHit],
          renderCustomHeader: ({ hit }) => (
            <div data-test-subj="docViewerFlyoutHeaderHit" data-message={hit.raw._source?.message}>
              Header
            </div>
          ),
        })}
      />
    );

    expect(screen.getByTestId('docViewerFlyoutHeaderHit')).toHaveAttribute(
      'data-message',
      'fresh message'
    );
    expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeInTheDocument();
    expect(screen.getByTestId('docViewerFlyoutNavigationPage-1')).toBeInTheDocument();
  });

  it('falls back to the provided hit and hides pagination when the current hit is missing', () => {
    const staleHit = buildHit({ id: 'shared-hit', message: 'stale message' });
    const unrelatedHit = buildHit({ id: 'other-hit', message: 'other message' });
    const secondUnrelatedHit = buildHit({ id: 'third-hit', message: 'third message' });

    render(
      <UnifiedDocViewerFlyout
        {...buildProps({
          hit: staleHit,
          hits: [unrelatedHit, secondUnrelatedHit],
          renderCustomHeader: ({ hit }) => (
            <div data-test-subj="docViewerFlyoutHeaderHit" data-message={hit.raw._source?.message}>
              Header
            </div>
          ),
        })}
      />
    );

    expect(screen.getByTestId('docViewerFlyoutHeaderHit')).toHaveAttribute(
      'data-message',
      'stale message'
    );
    expect(screen.queryByTestId('docViewerFlyoutNavigation')).not.toBeInTheDocument();
  });
});
