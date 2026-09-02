/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { openLazySystemFlyout } from './open_lazy_system_flyout';

const overlayRef = { close: jest.fn() } as unknown as OverlayRef;
const openSystemFlyout = jest.fn(() => overlayRef);
const core = {
  overlays: { openSystemFlyout },
  application: { currentAppId$: { pipe: () => ({ subscribe: () => undefined }) } },
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
});
