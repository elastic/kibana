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
  notifications: { toasts: { addWarning: jest.fn(), addError: jest.fn() } },
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
        resizable: true,
        session: 'start',
        size: 500,
      })
    );
  });

  it('closes and shows the error when loading fails', async () => {
    const error = new Error('Failed');
    openLazySystemFlyout({
      core,
      loadContent: async () => {
        throw error;
      },
    });
    render(openSystemFlyout.mock.calls[0][0]);

    await waitFor(() =>
      expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Unable to load edit flyout content',
      })
    );
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
  });

  it('closes and warns when there is no content', async () => {
    openLazySystemFlyout({ core, loadContent: async () => null });
    render(openSystemFlyout.mock.calls[0][0]);

    await waitFor(() => expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1));
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
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
    openSystemFlyout.mock.calls[0][1]?.onClose?.();
    view.unmount();

    await act(async () => {
      if (outcome === 'resolve') resolveLoad(<div>Late content</div>);
      else rejectLoad(new Error('Late failure'));
    });
    expect(screen.queryByText('Late content')).not.toBeInTheDocument();
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
    expect(overlayRef.close).toHaveBeenCalledTimes(1);
  });

  describe('focus management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      document.body.innerHTML = '';
    });

    const getOnClose = () => openSystemFlyout.mock.calls[0][1]?.onClose;

    it('returns focus to the element that was focused when the flyout was opened', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      openLazySystemFlyout({ core, loadContent: async () => <div>Content</div> });

      // Simulate the flyout taking focus away from the trigger.
      const insideFlyout = document.createElement('input');
      document.body.appendChild(insideFlyout);
      insideFlyout.focus();

      getOnClose()?.();
      jest.runAllTimers();

      expect(document.activeElement).toBe(trigger);
    });

    it('re-queries the trigger by id when the original node was replaced by a re-render', () => {
      const trigger = document.createElement('button');
      trigger.id = 'editTrigger';
      document.body.appendChild(trigger);
      trigger.focus();

      openLazySystemFlyout({ core, loadContent: async () => <div>Content</div> });

      getOnClose()?.();

      // The trigger re-renders after the flyout closes, before the deferred focus fires.
      trigger.remove();
      const refreshed = document.createElement('button');
      refreshed.id = 'editTrigger';
      document.body.appendChild(refreshed);

      jest.runAllTimers();

      expect(document.activeElement).toBe(refreshed);
    });

    it('does not throw when the trigger was removed and has no id to re-query', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      openLazySystemFlyout({ core, loadContent: async () => <div>Content</div> });

      trigger.remove();

      expect(() => {
        getOnClose()?.();
        jest.runAllTimers();
      }).not.toThrow();
    });

    it('defers return focus until after the flyout closes', () => {
      const trigger = document.createElement('button');
      trigger.id = 'editTrigger';
      document.body.appendChild(trigger);
      trigger.focus();

      openLazySystemFlyout({ core, loadContent: async () => <div>Content</div> });

      const insideFlyout = document.createElement('input');
      document.body.appendChild(insideFlyout);
      insideFlyout.focus();

      getOnClose()?.();
      expect(document.activeElement).not.toBe(trigger);

      jest.runAllTimers();

      expect(document.activeElement).toBe(trigger);
    });
  });
});
