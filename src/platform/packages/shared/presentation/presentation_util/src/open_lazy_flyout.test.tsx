/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { openLazyFlyout } from './open_lazy_flyout';
import { getPanelContextMenuTriggerId } from './focus_helpers';
import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn((x) => x), // identity for simplicity
}));

const overlayRef = { close: jest.fn() } as unknown as OverlayRef;
const openFlyout = jest.fn(() => overlayRef);
const core = {
  overlays: { openFlyout },
  application: {
    currentAppId$: { pipe: () => ({ subscribe: () => {} }) },
  },
} as unknown as CoreStart;
const loadContent = jest.fn(async () => <div>Test Content</div>);
const props = {
  core,
  loadContent,
  flyoutProps: {
    'data-test-subj': 'lazyFlyoutTest',
  },
  triggerId: 'testTrigger',
};

describe('openLazyFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens flyout with default props and mounts LazyFlyout and return flyout ref', async () => {
    const ref = openLazyFlyout(props);

    expect(ref).toBe(overlayRef);
    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(), // React element
      expect.objectContaining({
        'aria-labelledby': 'modalTitleId_generated-id',
        className: 'kbnPresentationLazyFlyout',
        'data-test-subj': 'lazyFlyoutTest',
        isResizable: true,
        maxWidth: 800,
        size: 500,
        outsideClickCloses: true,
        ownFocus: true,
        paddingSize: 'm',
        type: 'push',
      })
    );
  });

  it('calls overlayTracker.openOverlay when parentApi supports it', () => {
    const parentApi = { openOverlay: jest.fn(), clearOverlays: jest.fn() };
    openLazyFlyout({ core, parentApi, loadContent, flyoutProps: { focusedPanelId: 'abc' } });
    expect(parentApi.openOverlay).toHaveBeenCalledWith(overlayRef, { focusedPanelId: 'abc' });
  });

  it('does not call overlayTracker.openOverlay when parentApi does not support it', () => {
    const parentApi = {}; // no openOverlay
    openLazyFlyout({ core, parentApi, loadContent });
    expect(openFlyout).toHaveBeenCalled();
  });

  it('uses overlay type when parent publishes panelFlyoutType overlay', () => {
    const parentApi = {
      openOverlay: jest.fn(),
      clearOverlays: jest.fn(),
      panelFlyoutType: 'overlay' as const,
    };

    openLazyFlyout({ core, parentApi, loadContent });

    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'overlay',
        ownFocus: false,
      })
    );
  });

  it('prefers explicit flyoutProps.type over parent panelFlyoutType', () => {
    const parentApi = {
      openOverlay: jest.fn(),
      clearOverlays: jest.fn(),
      panelFlyoutType: 'overlay' as const,
    };

    openLazyFlyout({ core, parentApi, loadContent, flyoutProps: { type: 'push' } });

    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'push',
      })
    );
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

    const getOnClose = () =>
      (openFlyout.mock.calls[0] as unknown as [unknown, { onClose: () => void }])[1].onClose;

    it('returns focus to the element that was focused when the flyout was opened', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      openLazyFlyout({ core, loadContent });

      // Simulate the flyout taking focus away from the trigger.
      const insideFlyout = document.createElement('input');
      document.body.appendChild(insideFlyout);
      insideFlyout.focus();

      getOnClose()();
      jest.runAllTimers();

      expect(document.activeElement).toBe(trigger);
    });

    it('re-queries the trigger by id when the original node was replaced by a re-render', () => {
      const trigger = document.createElement('button');
      trigger.id = 'panelActionButton';
      document.body.appendChild(trigger);
      trigger.focus();

      openLazyFlyout({ core, loadContent });

      getOnClose()();

      // Simulate the triggering panel re-rendering as a result of closing the
      // flyout (after onClose runs, before the deferred focus fires): the original
      // node is replaced by a fresh node with the same id.
      document.body.removeChild(trigger);
      const refreshed = document.createElement('button');
      refreshed.id = 'panelActionButton';
      document.body.appendChild(refreshed);

      jest.runAllTimers();

      expect(document.activeElement).toBe(refreshed);
    });

    it('does not throw when the trigger was removed and has no id to re-query', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      openLazyFlyout({ core, loadContent });

      document.body.removeChild(trigger);

      expect(() => {
        getOnClose()();
        jest.runAllTimers();
      }).not.toThrow();
    });

    it('returns focus to the triggerId element when provided', () => {
      const trigger = document.createElement('button');
      trigger.id = 'myTrigger';
      document.body.appendChild(trigger);

      openLazyFlyout({ core, loadContent, flyoutProps: { triggerId: 'myTrigger' } });

      getOnClose()();
      jest.runAllTimers();

      expect(document.activeElement).toBe(trigger);
    });

    it("returns focus to the panel's context menu toggle when focus was lost after the menu closed", () => {
      // Mirrors a flyout opened asynchronously from the panel "..." context menu: by
      // the time the flyout opens the menu (and the menu item that had focus) is gone
      // and focus has fallen to <body>. Focus must return to the persistent toggle
      // identified by focusedPanelId.
      const panelId = 'panel-1';
      const toggle = document.createElement('button');
      toggle.id = getPanelContextMenuTriggerId(panelId);
      document.body.appendChild(toggle);

      // No element is focused (focus was dropped to <body>).
      openLazyFlyout({ core, loadContent, flyoutProps: { focusedPanelId: panelId } });

      getOnClose()();
      jest.runAllTimers();

      expect(document.activeElement).toBe(toggle);
    });

    it('prefers the previously focused element over the panel context menu fallback', () => {
      const panelId = 'panel-1';
      const toggle = document.createElement('button');
      toggle.id = getPanelContextMenuTriggerId(panelId);
      document.body.appendChild(toggle);

      // A quick-action button had focus when the flyout opened.
      const quickAction = document.createElement('button');
      quickAction.id = 'quickActionButton';
      document.body.appendChild(quickAction);
      quickAction.focus();

      openLazyFlyout({ core, loadContent, flyoutProps: { focusedPanelId: panelId } });

      getOnClose()();
      jest.runAllTimers();

      expect(document.activeElement).toBe(quickAction);
    });
  });
});
