/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { InspectOverlay } from './inspect_overlay';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { findSourceComponent } from '../../../lib/fiber/find_source_component';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { isEscapeKey } from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { mockBranch } from '../../../__mocks__/mocks';

jest.mock('../../../lib/dom/get_element_from_point', () => ({
  getElementFromPoint: jest.fn(),
}));

jest.mock('../../../lib/fiber/find_source_component', () => ({
  findSourceComponent: jest.fn(),
}));

jest.mock('../../../lib/get_inspected_element_data', () => ({
  getInspectedElementData: jest.fn(),
}));

jest.mock('../../../lib/keyboard_shortcut/keyboard_shortcut', () => ({
  isKeyboardShortcut: jest.fn(),
  isMac: jest.fn(),
  isEscapeKey: jest.fn(),
}));

describe('InspectOverlay', () => {
  let mockCoreStart: CoreStart;

  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    jest.clearAllMocks();
  });

  it('should render overlay with correct test id', () => {
    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={jest.fn()}
        setIsInspecting={jest.fn()}
        branch={mockBranch}
      />
    );

    const overlay = screen.getByTestId('inspectOverlayContainer');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ position: 'fixed' });
  });

  it('should update highlight position on pointer move', () => {
    const fakeTarget = document.createElement('div');
    fakeTarget.getBoundingClientRect = jest.fn(
      () => ({ top: 10, left: 10, width: 100, height: 50 } as DOMRect)
    );
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (findSourceComponent as jest.Mock).mockReturnValue({
      path: 'fakePath',
      sourceComponent: { type: 'FakeComponent', element: document.createElement('div') },
    });

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={jest.fn()}
        setIsInspecting={jest.fn()}
        branch={mockBranch}
      />
    );

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    const overlay = screen.getByTestId('inspectOverlayContainer');
    expect(overlay).toBeInTheDocument();
  });

  it('should open flyout when clicking on an element and keep inspect mode active', async () => {
    const setFlyoutOverlayRef = jest.fn();
    const setIsInspecting = jest.fn();

    const fakeTarget = document.createElement('div');
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (getInspectedElementData as jest.Mock).mockResolvedValue({ some: 'data' });

    const flyoutMock = { close: jest.fn(), onClose: Promise.resolve() };
    mockCoreStart.overlays.openFlyout = jest.fn(() => flyoutMock);

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={setFlyoutOverlayRef}
        setIsInspecting={setIsInspecting}
        branch={mockBranch}
      />
    );

    fireEvent.click(document, { target: fakeTarget });

    await waitFor(() => {
      expect(mockCoreStart.overlays.openFlyout).toHaveBeenCalledTimes(1);
      expect(setFlyoutOverlayRef).toHaveBeenCalledWith(flyoutMock);
    });
    // Inspector must remain active so the user can keep hovering / clicking
    // additional elements; the flyout only replaces, not toggles inspect mode.
    expect(setIsInspecting).not.toHaveBeenCalled();
  });

  it('should exit inspect mode when the flyout is closed by the user', async () => {
    const setFlyoutOverlayRef = jest.fn();
    const setIsInspecting = jest.fn();

    const fakeTarget = document.createElement('div');
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (getInspectedElementData as jest.Mock).mockResolvedValue({ some: 'data' });

    const flyoutMock = { close: jest.fn(), onClose: Promise.resolve() };
    const openFlyout = jest.fn().mockReturnValue(flyoutMock);
    mockCoreStart.overlays.openFlyout = openFlyout;

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={setFlyoutOverlayRef}
        setIsInspecting={setIsInspecting}
        branch={mockBranch}
      />
    );

    fireEvent.click(document, { target: fakeTarget });

    // Grab the `onClose` option that the overlay handed to openFlyout, then
    // simulate EuiFlyout calling it (X-button / Escape).
    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    const passedOptions = openFlyout.mock.calls[0][1];
    (passedOptions as { onClose: (f: unknown) => void }).onClose(flyoutMock);

    expect(flyoutMock.close).toHaveBeenCalled();
    expect(setFlyoutOverlayRef).toHaveBeenLastCalledWith(null);
    expect(setIsInspecting).toHaveBeenCalledWith(false);
  });

  it('should stay in inspect mode if no inspectable element is under the cursor', async () => {
    const setFlyoutOverlayRef = jest.fn();
    const setIsInspecting = jest.fn();

    (getElementFromPoint as jest.Mock).mockReturnValue(null);

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={setFlyoutOverlayRef}
        setIsInspecting={setIsInspecting}
        branch={mockBranch}
      />
    );

    fireEvent.click(document, { target: document.body });

    await waitFor(() => {
      // Click on a non-inspectable region (e.g. the flyout itself) should be
      // a no-op now — the only way to exit inspect mode is via the flyout
      // close button, Escape, or toggling the inspect button.
      expect(setIsInspecting).not.toHaveBeenCalled();
      expect(setFlyoutOverlayRef).not.toHaveBeenCalled();
    });
  });

  it('should close overlay when escape key is pressed', () => {
    const setIsInspecting = jest.fn();

    (isEscapeKey as jest.Mock).mockReturnValue(true);

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={jest.fn()}
        setIsInspecting={setIsInspecting}
        branch={mockBranch}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(setIsInspecting).toHaveBeenCalledWith(false);
  });
});
