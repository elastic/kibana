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
import userEvent from '@testing-library/user-event';
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

const renderFlyout = (overrides: Partial<UnifiedDocViewerFlyoutProps> = {}) => {
  const props = buildProps(overrides);
  const user = userEvent.setup();

  render(<UnifiedDocViewerFlyout {...props} />);

  return { props, user };
};

describe('UnifiedDocViewerFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unifiedDocViewerServices = createUnifiedDocViewerServices();
    setUnifiedDocViewerServices(unifiedDocViewerServices);
  });

  it('uses the refreshed hit from hits when the current hit is found', () => {
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
  });

  it('falls back to the provided hit when the current hit is missing', () => {
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
  });

  describe('keyboard navigation', () => {
    const hit0 = buildHit({ id: 'hit-0', message: 'message 0' });
    const hit1 = buildHit({ id: 'hit-1', message: 'message 1' });
    const hit2 = buildHit({ id: 'hit-2', message: 'message 2' });
    const hits = [hit0, hit1, hit2];

    it('navigates to the next hit with ArrowRight', async () => {
      const { props, user } = renderFlyout({ hit: hit1, hits });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowRight}');
      expect(props.setExpandedDoc).toHaveBeenCalledWith(hit2);
    });

    it('navigates to the previous hit with ArrowLeft', async () => {
      const { props, user } = renderFlyout({ hit: hit1, hits });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowLeft}');
      expect(props.setExpandedDoc).toHaveBeenCalledWith(hit0);
    });

    it('does not navigate past the first hit with ArrowLeft', async () => {
      const { props, user } = renderFlyout({ hit: hit0, hits });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowLeft}');
      expect(props.setExpandedDoc).not.toHaveBeenCalled();
    });

    it('does not navigate past the last hit with ArrowRight', async () => {
      const { props, user } = renderFlyout({ hit: hit2, hits });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowRight}');
      expect(props.setExpandedDoc).not.toHaveBeenCalled();
    });

    it('does not navigate when hits is undefined', async () => {
      const { props, user } = renderFlyout({ hit: hit0, hits: undefined });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowRight}{ArrowLeft}');
      expect(props.setExpandedDoc).not.toHaveBeenCalled();
    });

    it('does not navigate backward when the expanded hit is not in hits', async () => {
      const missingHit = buildHit({ id: 'missing-hit', message: 'missing' });
      const { props, user } = renderFlyout({ hit: missingHit, hits });

      screen.getByTestId('euiFlyoutBodyOverflow').focus();
      await user.keyboard('{ArrowLeft}');
      expect(props.setExpandedDoc).not.toHaveBeenCalled();
    });

    it('does not navigate when an input element is focused', async () => {
      const { props, user } = renderFlyout({
        hit: hit1,
        hits,
        renderCustomHeader: () => <input data-test-subj="flyoutCustomInput" />,
      });

      screen.getByTestId('flyoutCustomInput').focus();
      await user.keyboard('{ArrowRight}{ArrowLeft}');
      expect(props.setExpandedDoc).not.toHaveBeenCalled();
    });
  });
});
