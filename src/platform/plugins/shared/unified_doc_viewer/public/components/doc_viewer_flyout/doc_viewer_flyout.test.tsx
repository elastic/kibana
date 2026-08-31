/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ForwardedRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiFlyoutProps } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';
import { UnifiedDocViewerFlyout, type UnifiedDocViewerFlyoutProps } from './doc_viewer_flyout';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const react = jest.requireActual('react');

  return {
    ...actual,
    EuiFlyout: react.forwardRef((props: EuiFlyoutProps, ref: ForwardedRef<HTMLDivElement>) => (
      <div
        ref={ref}
        data-test-subj={props['data-test-subj']}
        onKeyDown={props.onKeyDown}
        onKeyDownCapture={props.onKeyDownCapture}
        onPointerDown={props.onPointerDown}
        onPointerCancel={props.onPointerCancel}
      >
        <button data-test-subj="euiResizableButton" onPointerUp={() => props.onResize?.(700)}>
          <span>Resize handle</span>
        </button>
        <button onClick={() => props.onResize?.(700)}>Trigger resize</button>
        <div>
          <button data-test-subj="euiResizableButton">
            <span>Nested resize handle</span>
          </button>
        </div>
        {props.flyoutMenuProps && (
          <actual.EuiFlyoutMenu {...props.flyoutMenuProps} hideCloseButton />
        )}
        {props.children}
      </div>
    )),
  };
});

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

  describe('flyout width persistence', () => {
    const storageKey = 'docViewerFlyoutTestWidth';

    afterEach(() => {
      localStorage.removeItem(storageKey);
    });

    const renderFlyout = () => {
      render(
        <UnifiedDocViewerFlyout {...buildProps({ flyoutWidthLocalStorageKey: storageKey })} />
      );
      // useLocalStorage initializes the key during render; assertions below only cover later writes.
      localStorage.removeItem(storageKey);

      return {
        resizeHandle: screen.getAllByTestId('euiResizableButton')[0],
        triggerResize: screen.getByRole('button', { name: 'Trigger resize' }),
      };
    };

    it('does not persist a resize without a preceding handle interaction', () => {
      const { triggerResize } = renderFlyout();

      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('persists the next resize after a pointer interaction with a handle descendant', () => {
      const { triggerResize } = renderFlyout();

      fireEvent.pointerDown(screen.getByText('Resize handle'));
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBe('700');
    });

    it('does not persist after interacting with a nested resize handle', () => {
      const { triggerResize } = renderFlyout();

      fireEvent.pointerDown(screen.getByText('Nested resize handle'));
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('does not persist later resize callbacks from container changes', () => {
      const { resizeHandle, triggerResize } = renderFlyout();

      fireEvent.pointerDown(resizeHandle);
      fireEvent.click(triggerResize);
      localStorage.removeItem(storageKey);
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('does not persist a resize after a cancelled pointer interaction', () => {
      const { resizeHandle, triggerResize } = renderFlyout();

      fireEvent.pointerDown(resizeHandle);
      fireEvent.pointerCancel(resizeHandle);
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('does not leave persistence armed after clicking the handle without dragging', () => {
      const { resizeHandle, triggerResize } = renderFlyout();

      fireEvent.pointerDown(resizeHandle);
      fireEvent.pointerUp(resizeHandle);
      localStorage.removeItem(storageKey);
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('persists a keyboard resize from the handle', () => {
      const { resizeHandle, triggerResize } = renderFlyout();

      fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
      fireEvent.click(triggerResize);

      expect(localStorage.getItem(storageKey)).toBe('700');
    });
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

  it('renders trailing actions in the flyout menu', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    const trailingAction = {
      iconType: 'share' as const,
      'aria-label': 'Copy link to this document',
      toolTipContent: 'Copy link to this document',
      onClick,
    };

    render(
      <UnifiedDocViewerFlyout
        {...buildProps({
          flyoutMenuTrailingActions: [trailingAction],
        })}
      />
    );

    const shareButton = await screen.findByRole('button', {
      name: 'Copy link to this document',
    });

    await user.click(shareButton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe('document pinning behavior', () => {
    it('should update active page when hits reorder and the pinned doc is still present', () => {
      const pinnedHit = buildHit({ id: 'pinned-hit', message: 'pinned message' });
      const otherHits = [
        buildHit({ id: 'hit-1', message: 'hit 1' }),
        buildHit({ id: 'hit-2', message: 'hit 2' }),
        buildHit({ id: 'hit-3', message: 'hit 3' }),
        buildHit({ id: 'hit-4', message: 'hit 4' }),
      ];
      const initialHits = [pinnedHit, ...otherHits];
      const reorderedHits = [...otherHits, pinnedHit];

      const { rerender } = render(
        <UnifiedDocViewerFlyout {...buildProps({ hit: pinnedHit, hits: initialHits })} />
      );

      expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeInTheDocument();
      expect(screen.getByTestId('docViewerFlyoutNavigationPage-0')).toBeInTheDocument();

      rerender(<UnifiedDocViewerFlyout {...buildProps({ hit: pinnedHit, hits: reorderedHits })} />);

      expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeInTheDocument();
      expect(screen.getByTestId('docViewerFlyoutNavigationPage-4')).toBeInTheDocument();
    });

    it('should hide navigation and show stale doc when hits change to exclude the pinned doc', () => {
      const pinnedHit = buildHit({ id: 'pinned-hit', message: 'pinned message' });
      const otherHits = [
        buildHit({ id: 'hit-1', message: 'hit 1' }),
        buildHit({ id: 'hit-2', message: 'hit 2' }),
      ];

      const renderHeader = ({ hit }: { hit: { raw: { _source?: Record<string, unknown> } } }) => (
        <div data-test-subj="docViewerFlyoutHeaderHit" data-message={hit.raw._source?.message}>
          Header
        </div>
      );

      const { rerender } = render(
        <UnifiedDocViewerFlyout
          {...buildProps({
            hit: pinnedHit,
            hits: [pinnedHit, ...otherHits],
            renderCustomHeader: renderHeader,
          })}
        />
      );

      expect(screen.getByTestId('docViewerFlyoutNavigation')).toBeInTheDocument();

      rerender(
        <UnifiedDocViewerFlyout
          {...buildProps({ hit: pinnedHit, hits: otherHits, renderCustomHeader: renderHeader })}
        />
      );

      expect(screen.getByTestId('docViewerFlyoutHeaderHit')).toHaveAttribute(
        'data-message',
        'pinned message'
      );
      expect(screen.queryByTestId('docViewerFlyoutNavigation')).not.toBeInTheDocument();
    });

    it('should hide navigation when exactly one result exists', () => {
      const pinnedHit = buildHit({ id: 'pinned-hit', message: 'pinned message' });

      render(<UnifiedDocViewerFlyout {...buildProps({ hit: pinnedHit, hits: [pinnedHit] })} />);

      expect(screen.queryByTestId('docViewerFlyoutNavigation')).not.toBeInTheDocument();
    });
  });
});
