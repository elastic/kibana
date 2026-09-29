/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('../../../lib/dom/get_element_from_point', () => {
  const mocked = {
    getElementFromPoint: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/fiber/find_source_component', () => {
  const mocked = {
    findSourceComponent: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/get_inspected_element_data', () => {
  const mocked = {
    getInspectedElementData: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../lib/keyboard_shortcut/keyboard_shortcut', () => {
  const mocked = {
    isKeyboardShortcut: vi.fn(),
    isMac: vi.fn(),
    isEscapeKey: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('InspectOverlay', () => {
  let mockCoreStart: CoreStart;

  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    vi.clearAllMocks();
  });

  it('should render overlay with correct test id', () => {
    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={vi.fn()}
        setIsInspecting={vi.fn()}
        branch={mockBranch}
      />
    );

    const overlay = screen.getByTestId('inspectOverlayContainer');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ position: 'fixed' });
  });

  it('should update highlight position on pointer move', () => {
    const fakeTarget = document.createElement('div');
    fakeTarget.getBoundingClientRect = vi.fn(
      () => ({ top: 10, left: 10, width: 100, height: 50 } as DOMRect)
    );
    (getElementFromPoint as Mock).mockReturnValue(fakeTarget);
    (findSourceComponent as Mock).mockReturnValue({
      path: 'fakePath',
      sourceComponent: { type: 'FakeComponent', element: document.createElement('div') },
    });

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={vi.fn()}
        setIsInspecting={vi.fn()}
        branch={mockBranch}
      />
    );

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    const overlay = screen.getByTestId('inspectOverlayContainer');
    expect(overlay).toBeInTheDocument();
  });

  it('should open flyout when clicking on an element', async () => {
    const setFlyoutOverlayRef = vi.fn();
    const setIsInspecting = vi.fn();

    const fakeTarget = document.createElement('div');
    (getElementFromPoint as Mock).mockReturnValue(fakeTarget);
    (getInspectedElementData as Mock).mockResolvedValue({ some: 'data' });

    const flyoutMock = { close: vi.fn(), onClose: Promise.resolve() };
    mockCoreStart.overlays.openFlyout = vi.fn(() => flyoutMock);

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

  it('should set inspecting to false if no element is found on click', async () => {
    const setFlyoutOverlayRef = vi.fn();
    const setIsInspecting = vi.fn();

    (getElementFromPoint as Mock).mockReturnValue(null);

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
    const setIsInspecting = vi.fn();

    (isEscapeKey as Mock).mockReturnValue(true);

    renderWithI18n(
      <InspectOverlay
        core={mockCoreStart}
        setFlyoutOverlayRef={vi.fn()}
        setIsInspecting={setIsInspecting}
        branch={mockBranch}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(setIsInspecting).toHaveBeenCalledWith(false);
  });
});
