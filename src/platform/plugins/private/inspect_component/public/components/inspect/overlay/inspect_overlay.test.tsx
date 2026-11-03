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
import { InspectOverlay } from './inspect_overlay';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { findSourceComponent } from '../../../lib/fiber/find_source_component';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { isEscapeKey } from '../../../lib/keyboard_shortcut/keyboard_shortcut';
import { mockBranch } from '../../../__mocks__/mocks';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(() => true),
}));

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
    let fakeTarget: HTMLElement;

    beforeEach(() => {
      fakeTarget = document.createElement('div');
      fakeTarget.textContent = 'Save';
      (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);

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

    it('should copy the element context on click, show feedback and stay in grab mode', async () => {
      fireEvent.click(document, { target: fakeTarget });

      await waitFor(() => {
        expect(copyToClipboard).toHaveBeenCalledWith('<div>Save</div>');
      });
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(mockCoreStart.overlays.openFlyout).not.toHaveBeenCalled();
      expect(setFlyoutOverlayRef).not.toHaveBeenCalled();
      expect(setIsInspecting).not.toHaveBeenCalled();
    });

    it('should carry the element context and use the element as drag image on drag start', () => {
      const dataTransfer = { setData: jest.fn(), setDragImage: jest.fn(), effectAllowed: 'none' };
      const highlightBox = screen.getByTestId('inspectHighlightBox');
      // jsdom has no DragEvent, so pointer coordinates have to be defined on the plain event
      const dragStartEvent = createEvent.dragStart(highlightBox, { dataTransfer });
      Object.defineProperties(dragStartEvent, { clientX: { value: 15 }, clientY: { value: 25 } });

      fireEvent(highlightBox, dragStartEvent);

      expect(dataTransfer.effectAllowed).toBe('copy');
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '<div>Save</div>');
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(fakeTarget, 15, 25);
      expect(copyToClipboard).toHaveBeenCalledWith('<div>Save</div>');
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
