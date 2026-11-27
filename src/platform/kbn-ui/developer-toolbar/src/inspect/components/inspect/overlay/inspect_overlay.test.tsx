/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, createEvent, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { copyToClipboard } from '@elastic/eui';
import {
  findFiberWithDebugSource,
  findSourceComponentName,
  getComponentStack,
  getFiberFromElement,
} from '../../../../react_fiber';
import { InspectOverlay } from './inspect_overlay';
import { getElementFromPoint } from '../../../lib/dom/get_element_from_point';
import { getInspectedElementData } from '../../../lib/get_inspected_element_data';
import { mockComponentData } from '../../../__mocks__/mocks';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(() => true),
}));

jest.mock('../../../../react_fiber', () => ({
  ...jest.requireActual('../../../../react_fiber'),
  findFiberWithDebugSource: jest.fn(),
  findSourceComponentName: jest.fn(),
  getComponentStack: jest.fn(),
  getFiberFromElement: jest.fn(),
}));

jest.mock('../../../lib/dom/get_element_from_point', () => ({
  getElementFromPoint: jest.fn(),
}));

jest.mock('../../../lib/get_inspected_element_data', () => ({
  getInspectedElementData: jest.fn(),
}));

describe('InspectOverlay', () => {
  const resolveFileData = jest.fn();

  const renderOverlay = (props: Partial<React.ComponentProps<typeof InspectOverlay>> = {}) =>
    renderWithI18n(
      <InspectOverlay
        resolveFileData={resolveFileData}
        ignoredClassPrefixes={[]}
        setIsInspecting={jest.fn()}
        onInspect={jest.fn()}
        onMissingDebugSource={jest.fn()}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render overlay with correct test id', () => {
    renderOverlay();

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

    renderOverlay({ ignoredClassPrefixes: ['kbnChromeLayout'] });

    expect(screen.queryByTestId('inspectHighlightBox')).not.toBeInTheDocument();

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    expect(getElementFromPoint).toHaveBeenCalledWith(expect.anything(), ['kbnChromeLayout']);
    expect(screen.getByTestId('inspectHighlightBadge')).toHaveTextContent('FakeComponent');
    expect(screen.getByTestId('inspectHighlightBox')).toHaveStyle({ width: '100px' });
    expect(screen.getByTestId('inspectHighlightBox')).toHaveAttribute('draggable', 'false');
    expect(resolveFileData).not.toHaveBeenCalled();
  });

  it('should show a hint when the hovered React element has no _debugSource', () => {
    const onMissingDebugSource = jest.fn();
    const fakeTarget = document.createElement('div');
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (findFiberWithDebugSource as jest.Mock).mockReturnValue(null);
    (getFiberFromElement as jest.Mock).mockReturnValue({ type: 'div' });

    renderOverlay({ onMissingDebugSource });

    expect(screen.queryByTestId('inspectMissingDebugSourceHint')).not.toBeInTheDocument();

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    expect(screen.getByTestId('inspectMissingDebugSourceHint')).toBeInTheDocument();
    expect(onMissingDebugSource).toHaveBeenCalled();
  });

  it('should not show the hint for non-React elements', () => {
    const onMissingDebugSource = jest.fn();
    (getElementFromPoint as jest.Mock).mockReturnValue(document.createElement('div'));
    (findFiberWithDebugSource as jest.Mock).mockReturnValue(null);
    (getFiberFromElement as jest.Mock).mockReturnValue(null);

    renderOverlay({ onMissingDebugSource });

    fireEvent.pointerMove(window, { clientX: 30, clientY: 20 });

    expect(screen.queryByTestId('inspectMissingDebugSourceHint')).not.toBeInTheDocument();
    expect(onMissingDebugSource).not.toHaveBeenCalled();
  });

  it('should report the inspected component when clicking on an element', async () => {
    const onInspect = jest.fn();
    const setIsInspecting = jest.fn();

    const fakeTarget = document.createElement('div');
    (getElementFromPoint as jest.Mock).mockReturnValue(fakeTarget);
    (getInspectedElementData as jest.Mock).mockResolvedValue(mockComponentData);

    renderOverlay({ onInspect, setIsInspecting });

    fireEvent.click(document, { target: fakeTarget });

    await waitFor(() => {
      expect(getInspectedElementData).toHaveBeenCalledWith(
        expect.objectContaining({ resolveFileData })
      );
      expect(onInspect).toHaveBeenCalledWith(mockComponentData, fakeTarget);
      expect(setIsInspecting).toHaveBeenCalledWith(false);
    });
  });

  it('should exit inspect mode without a flyout if the component cannot be resolved', async () => {
    const onInspect = jest.fn();
    const setIsInspecting = jest.fn();

    (getElementFromPoint as jest.Mock).mockReturnValue(document.createElement('div'));
    (getInspectedElementData as jest.Mock).mockResolvedValue(null);

    renderOverlay({ onInspect, setIsInspecting });

    fireEvent.click(document, { target: document.body });

    await waitFor(() => {
      expect(setIsInspecting).toHaveBeenCalledWith(false);
    });
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('should set inspecting to false if no element is found on click', async () => {
    const onInspect = jest.fn();
    const setIsInspecting = jest.fn();

    (getElementFromPoint as jest.Mock).mockReturnValue(null);

    renderOverlay({ onInspect, setIsInspecting });

    fireEvent.click(document, { target: document.body });

    await waitFor(() => {
      expect(setIsInspecting).toHaveBeenCalledWith(false);
      expect(onInspect).not.toHaveBeenCalled();
    });
  });

  describe('grab mode', () => {
    const setIsInspecting = jest.fn();
    const onInspect = jest.fn();
    const repoRoot = '/repo/';
    const fakeSource = {
      fileName: `${repoRoot}src/save_button.tsx`,
      lineNumber: 1,
      columnNumber: 1,
    };
    const fakeFiber = { type: 'button' };
    const stackSource = { ...fakeSource, lineNumber: 42, columnNumber: 7 };
    const absoluteContext = `<div>Save</div>\n  in SaveButton (${repoRoot}src/save_button.tsx:42:7)`;
    const relativeContext = '<div>Save</div>\n  in SaveButton (src/save_button.tsx:42:7)';
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
        { name: 'SaveButton', source: stackSource },
      ]);
      resolveFileData.mockResolvedValue(null);
    });

    const renderGrabOverlay = () => renderOverlay({ mode: 'grab', setIsInspecting, onInspect });

    it('should highlight the hovered element without a label', () => {
      renderGrabOverlay();
      hoverTarget();

      expect(screen.getByTestId('inspectHighlightBox')).toHaveAttribute('draggable', 'true');
      expect(screen.queryByTestId('inspectHighlightBadge')).not.toBeInTheDocument();
    });

    it('should remove the highlight when the pointer moves over the developer toolbar', () => {
      renderGrabOverlay();
      hoverTarget();
      expect(screen.getByTestId('inspectHighlightBox')).toBeInTheDocument();

      (getElementFromPoint as jest.Mock).mockReturnValue(null);
      hoverTarget();

      expect(screen.queryByTestId('inspectHighlightBox')).not.toBeInTheDocument();
    });

    it('should copy the hovered element context on click, show feedback and stay in grab mode', async () => {
      renderGrabOverlay();
      hoverTarget();
      fireEvent.click(document, { target: fakeTarget });

      await waitFor(() => {
        expect(copyToClipboard).toHaveBeenCalledWith(absoluteContext);
      });
      expect(getComponentStack).toHaveBeenCalledWith(fakeFiber);
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(getInspectedElementData).not.toHaveBeenCalled();
      expect(onInspect).not.toHaveBeenCalled();
      expect(setIsInspecting).not.toHaveBeenCalled();
    });

    it('should show a failure badge when the clipboard copy fails', async () => {
      (copyToClipboard as jest.Mock).mockReturnValueOnce(false);
      renderGrabOverlay();
      hoverTarget();
      fireEvent.click(document, { target: fakeTarget });

      expect(await screen.findByText('Unable to copy to clipboard')).toBeInTheDocument();
    });

    it('should copy the hovered element context on the copy shortcut and show feedback', () => {
      const pressCopyShortcut = () =>
        fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true });

      renderGrabOverlay();

      // Nothing is hovered yet, so the browser's own copy must be left alone
      pressCopyShortcut();
      expect(copyToClipboard).not.toHaveBeenCalled();

      hoverTarget();
      pressCopyShortcut();

      expect(copyToClipboard).toHaveBeenCalledWith(absoluteContext);
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(setIsInspecting).not.toHaveBeenCalled();
    });

    it('should leave the copy shortcut to the browser in inspect mode', () => {
      renderOverlay({ mode: 'inspect' });
      hoverTarget();
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC', metaKey: true });

      expect(copyToClipboard).not.toHaveBeenCalled();
    });

    it('should resolve the repo root once through the host and shorten the paths with it', async () => {
      resolveFileData.mockResolvedValue({
        relativePath: 'src/save_button.tsx',
        baseFileName: 'save_button.tsx',
      });
      renderGrabOverlay();
      hoverTarget();
      hoverTarget();

      expect(resolveFileData).toHaveBeenCalledTimes(1);
      expect(resolveFileData).toHaveBeenCalledWith(fakeSource.fileName);

      await waitFor(() => {
        fireEvent.click(document, { target: fakeTarget });
        expect(copyToClipboard).toHaveBeenLastCalledWith(relativeContext);
      });
    });

    it('should keep absolute paths when the host resolver rejects', async () => {
      resolveFileData.mockRejectedValue(new Error('Network error'));
      renderGrabOverlay();
      hoverTarget();

      await waitFor(() => expect(resolveFileData).toHaveBeenCalledTimes(1));
      fireEvent.click(document, { target: fakeTarget });

      expect(copyToClipboard).toHaveBeenCalledWith(absoluteContext);
    });

    it('should carry the hovered element context on drag start without showing feedback', () => {
      renderGrabOverlay();
      hoverTarget();
      const dataTransfer = { setData: jest.fn(), setDragImage: jest.fn(), effectAllowed: 'none' };
      const highlightBox = screen.getByTestId('inspectHighlightBox');
      // jsdom has no DragEvent, so pointer coordinates have to be defined on the plain event
      const dragStartEvent = createEvent.dragStart(highlightBox, { dataTransfer });
      Object.defineProperties(dragStartEvent, { clientX: { value: 15 }, clientY: { value: 25 } });

      fireEvent(highlightBox, dragStartEvent);

      expect(dataTransfer.effectAllowed).toBe('copy');
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', absoluteContext);
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(fakeTarget, 15, 25);
      expect(copyToClipboard).toHaveBeenCalledWith(absoluteContext);
      expect(screen.queryByTestId('inspectHighlightBadge')).not.toBeInTheDocument();
    });
  });

  it('should close overlay when escape key is pressed', () => {
    const setIsInspecting = jest.fn();

    renderOverlay({ setIsInspecting });

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(setIsInspecting).toHaveBeenCalledWith(false);
  });
});
