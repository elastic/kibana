/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { openLazySystemFlyout } from './open_lazy_system_flyout';

const overlayRef = { close: jest.fn() } as unknown as OverlayRef;
type OpenSystemFlyout = CoreStart['overlays']['openSystemFlyout'];
const openSystemFlyout = jest.fn<ReturnType<OpenSystemFlyout>, Parameters<OpenSystemFlyout>>(
  () => overlayRef
);
const core = {
  overlays: { openSystemFlyout },
  application: { currentAppId$: { pipe: () => ({ subscribe: () => undefined }) } },
  notifications: { toasts: { addWarning: jest.fn() } },
} as unknown as CoreStart;

describe('openLazySystemFlyout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens a root managed flyout with the presentation defaults', () => {
    const ref = openLazySystemFlyout({
      core,
      loadContent: async () => <div>Content</div>,
      flyoutProps: { 'data-test-subj': 'managedEditor' },
    });

    expect(ref).toBe(overlayRef);
    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        className: 'kbnPresentationLazySystemFlyout',
        'data-test-subj': 'managedEditor',
        isResizable: true,
        session: 'start',
        size: 500,
      })
    );
  });

  it('tracks the managed flyout for compatible parents', () => {
    const parentApi = { openOverlay: jest.fn(), clearOverlays: jest.fn() };
    openLazySystemFlyout({
      core,
      parentApi,
      loadContent: async () => <div>Content</div>,
      flyoutProps: { focusedPanelId: 'panel-1' },
    });

    expect(parentApi.openOverlay).toHaveBeenCalledWith(overlayRef, {
      focusedPanelId: 'panel-1',
    });
  });

  it('closes, clears tracking, notifies, and restores focus after loading fails', async () => {
    const parentApi = { openOverlay: jest.fn(), clearOverlays: jest.fn() };
    const returnFocus = jest.fn();
    openLazySystemFlyout({
      core,
      parentApi,
      returnFocus,
      loadContent: async () => {
        throw new Error('Failed');
      },
    });
    render(openSystemFlyout.mock.calls[0][0]);

    await waitFor(() => expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1));
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
    expect(parentApi.clearOverlays).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(returnFocus).toHaveBeenCalledTimes(1));
  });

  it.each(['resolve', 'reject'] as const)('ignores a late %s after closing', async (outcome) => {
    let resolveLoad: (content: JSX.Element) => void = () => {};
    let rejectLoad: (error: Error) => void = () => {};
    const loading = new Promise<JSX.Element>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
    openLazySystemFlyout({ core, loadContent: () => loading });
    const view = render(openSystemFlyout.mock.calls[0][0]);
    openSystemFlyout.mock.calls[0][1]?.onClose?.(overlayRef);
    view.unmount();

    await act(async () => {
      if (outcome === 'resolve') resolveLoad(<div>Late content</div>);
      else rejectLoad(new Error('Late failure'));
    });
    expect(screen.queryByText('Late content')).not.toBeInTheDocument();
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
  });
});
