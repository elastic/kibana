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
import { screen, createEvent, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { copyToClipboard } from '@elastic/eui';
import {
  findFiberWithDebugSource,
  findSourceComponentName,
  getComponentStack,
} from '@kbn/react-fiber';
import { InspectOverlay } from './inspect_overlay';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import {
  isCopyKeyboardShortcut,
  isEscapeKey,
} from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { mockBranch } from '../../../__mocks__/mocks';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(() => true),
}));

jest.mock('@kbn/react-fiber', () => ({
  findFiberWithDebugSource: jest.fn(),
  findSourceComponentName: jest.fn(),
  getComponentStack: jest.fn(),
}));

jest.mock('../../../lib/dom/get_element_from_point', () => ({
  getElementFromPoint: jest.fn(),
}));

jest.mock('../../../lib/get_inspected_element_data', () => ({
  getInspectedElementData: jest.fn(),
}));

jest.mock('../../../lib/keyboard_shortcut/keyboard_shortcut', () => ({
  isKeyboardShortcut: jest.fn(),
  isCopyKeyboardShortcut: jest.fn(),
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

  it('should highlight the hovered element with its source component name on pointer move', () => {
    const fakeTarget = document.createElement('div');
    fakeTarget.getBoundingClientRect = jest.fn(
      () => ({ top: 10, left: 10, width: 100, height: 50 } as DOMRect)
    );
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (findFiberWithDebugSource as jest.Mock).mockReturnValue({
      element: fakeTarget,
      fiber: { type: 'div' },
      source: { fileName: 'a.tsx', lineNumber: 1, columnNumber: 1 },
    });
    (findSourceComponentName as jest.Mock).mockReturnValue('FakeComponent');

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={jest.fn()}
        setIsInspecting={jest.fn()}
        branch={mockBranch}
      />
    );

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    expect(screen.getByText('FakeComponent')).toBeInTheDocument();
    expect(screen.getByTestId('inspectHighlightBox')).toHaveStyle({ width: '100px' });
  });

  it('should open flyout when clicking on an element', async () => {
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
      expect(setIsInspecting).toHaveBeenCalledWith(false);
    });
  });

  describe('grab mode', () => {
    const setFlyoutOverlayRef = jest.fn();
    const setIsInspecting = jest.fn();
    const fakeSource = { fileName: '/repo/src/save_button.tsx', lineNumber: 1, columnNumber: 1 };
    const fakeFiber = { type: 'button' };
    const expectedContext = '<div>Save</div>\n  in SaveButton (/repo/src/save_button.tsx:42:7)';
    let fakeTarget: HTMLElement;

    const hoverTarget = () => fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    beforeEach(() => {
      fakeTarget = document.createElement('div');
      fakeTarget.textContent = 'Save';
      (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
      (findFiberWithDebugSource as jest.Mock).mockReturnValue({
        element: fakeTarget,
        fiber: fakeFiber,
        source: fakeSource,
      });
      (findSourceComponentName as jest.Mock).mockReturnValue('SaveButton');
      (getComponentStack as jest.Mock).mockReturnValue([
        { name: 'SaveButton', source: { ...fakeSource, lineNumber: 42, columnNumber: 7 } },
      ]);

      renderWithI18n(
        <InspectOverlay
          core={mockCoreStart}
          mode="grab"
          setFlyoutOverlayRef={setFlyoutOverlayRef}
          setIsInspecting={setIsInspecting}
          branch={mockBranch}
        />
      );
    });

    it('should highlight the hovered element without a label', () => {
      hoverTarget();

      expect(screen.getByTestId('inspectHighlightBox')).toBeInTheDocument();
      expect(screen.queryByTestId('inspectHighlightBadge')).not.toBeInTheDocument();
    });

    it('should remove the highlight when the pointer moves over the developer toolbar', () => {
      hoverTarget();
      expect(screen.getByTestId('inspectHighlightBox')).toBeInTheDocument();

      (getElementFromPoint as jest.Mock).mockReturnValue(null);
      hoverTarget();

      expect(screen.queryByTestId('inspectHighlightBox')).not.toBeInTheDocument();
    });

    it('should copy the hovered element context on click, show feedback and stay in grab mode', async () => {
      hoverTarget();
      fireEvent.click(document, { target: fakeTarget });

      await waitFor(() => {
        expect(copyToClipboard).toHaveBeenCalledWith(expectedContext);
      });
      expect(getComponentStack).toHaveBeenCalledWith(fakeFiber);
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(mockCoreStart.overlays.openFlyout).not.toHaveBeenCalled();
      expect(setFlyoutOverlayRef).not.toHaveBeenCalled();
      expect(setIsInspecting).not.toHaveBeenCalled();
    });

    it('should copy the hovered element context on the copy shortcut and show feedback', () => {
      (isCopyKeyboardShortcut as jest.Mock).mockReturnValue(true);
      const pressCopyShortcut = () =>
        fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true });

      // Nothing is hovered yet, so the browser's own copy must be left alone
      pressCopyShortcut();
      expect(copyToClipboard).not.toHaveBeenCalled();

      hoverTarget();
      pressCopyShortcut();

      expect(copyToClipboard).toHaveBeenCalledWith(expectedContext);
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(setIsInspecting).not.toHaveBeenCalled();
    });

    it('should carry the hovered element context on drag start without showing feedback', () => {
      hoverTarget();
      const dataTransfer = { setData: jest.fn(), setDragImage: jest.fn(), effectAllowed: 'none' };
      const highlightBox = screen.getByTestId('inspectHighlightBox');
      // jsdom has no DragEvent, so pointer coordinates have to be defined on the plain event
      const dragStartEvent = createEvent.dragStart(highlightBox, { dataTransfer });
      Object.defineProperties(dragStartEvent, { clientX: { value: 15 }, clientY: { value: 25 } });

      fireEvent(highlightBox, dragStartEvent);

      expect(dataTransfer.effectAllowed).toBe('copy');
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', expectedContext);
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(fakeTarget, 15, 25);
      expect(copyToClipboard).toHaveBeenCalledWith(expectedContext);
      expect(screen.queryByTestId('inspectHighlightBadge')).not.toBeInTheDocument();
    });
  });

  it('should set inspecting to false if no element is found on click', async () => {
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
      expect(setIsInspecting).toHaveBeenCalledWith(false);
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
