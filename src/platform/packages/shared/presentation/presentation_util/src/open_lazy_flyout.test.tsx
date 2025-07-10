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
import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn((x) => x), // identity for simplicity
}));

const overlayRef = { close: jest.fn() } as unknown as OverlayRef;
const openFlyout = jest.fn(() => overlayRef);
const core = { overlays: { openFlyout } } as unknown as CoreStart;
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
    openLazyFlyout({ core, parentApi, loadContent, uuid: 'abc' });
    expect(parentApi.openOverlay).toHaveBeenCalledWith(overlayRef, { focusedPanelId: 'abc' });
  });

  it('does not call overlayTracker.openOverlay when parentApi does not support it', () => {
    const parentApi = {}; // no openOverlay
    openLazyFlyout({ core, parentApi, loadContent });
    expect(openFlyout).toHaveBeenCalled();
  });
});
