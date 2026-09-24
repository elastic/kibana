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
import { openLazyFlyoutTemplate } from './open_lazy_flyout_template';

const overlayRef = { close: jest.fn() } as unknown as OverlayRef;
type OpenFlyoutTemplate = CoreStart['overlays']['openFlyoutTemplate'];
const openFlyoutTemplate = jest.fn<
  ReturnType<OpenFlyoutTemplate>,
  Parameters<OpenFlyoutTemplate>
>(() => overlayRef);
const core = {
  overlays: { openFlyoutTemplate },
  application: { currentAppId$: { pipe: () => ({ subscribe: () => undefined }) } },
  notifications: { toasts: { addWarning: jest.fn() } },
} as unknown as CoreStart;

describe('openLazyFlyoutTemplate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens a managed flyout template with the presentation defaults', () => {
    const ref = openLazyFlyoutTemplate({
      core,
      loadContent: async () => <div>Content</div>,
      flyoutProps: { 'data-test-subj': 'managedEditor' },
    });

    expect(ref).toBe(overlayRef);
    expect(openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        className: 'kbnPresentationLazyFlyoutTemplate',
        'data-test-subj': 'managedEditor',
        resizable: true,
        size: 500,
      }),
      expect.any(Function)
    );
  });

  it('tracks the managed flyout for compatible parents', () => {
    const parentApi = { openOverlay: jest.fn(), clearOverlays: jest.fn() };
    openLazyFlyoutTemplate({
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
    openLazyFlyoutTemplate({
      core,
      parentApi,
      returnFocus,
      loadContent: async () => {
        throw new Error('Failed');
      },
    });

    const content = openFlyoutTemplate.mock.calls[0][1];
    render(React.createElement(content));

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

    openLazyFlyoutTemplate({ core, loadContent: () => loading });
    const content = openFlyoutTemplate.mock.calls[0][1];
    const view = render(React.createElement(content));
    openFlyoutTemplate.mock.calls[0][0].onClose?.();
    view.unmount();

    await act(async () => {
      if (outcome === 'resolve') {
        resolveLoad(<div>Late content</div>);
      } else {
        rejectLoad(new Error('Late failure'));
      }
    });

    expect(screen.queryByText('Late content')).not.toBeInTheDocument();
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
  });
});
