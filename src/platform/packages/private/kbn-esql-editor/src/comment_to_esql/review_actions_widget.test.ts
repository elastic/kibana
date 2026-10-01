/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import { ReviewActionsWidget } from './review_actions_widget';

const buildEditor = (editorFocus: jest.Mock = jest.fn()) =>
  ({
    focus: editorFocus,
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({
        addZone: jest.fn(() => 'zone-id'),
        removeZone: jest.fn(),
        layoutZone: jest.fn(),
      });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
  } as unknown as monaco.editor.ICodeEditor);

describe('ReviewActionsWidget', () => {
  // Outside an EuiProvider, useEuiTheme returns the Amsterdam defaults — enough
  // for the widget's constructor to build its DOM without us hand-rolling tokens.
  const { result } = renderHook(() => useEuiTheme());
  const euiTheme = result.current.euiTheme;

  it('invokes the matching callback when each button is clicked', () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();

    const widget = new ReviewActionsWidget(euiTheme, buildEditor(), 1, { onAccept, onReject });
    const dom = widget.getDomNode();
    const [rejectBtn, acceptBtn] = Array.from(dom.querySelectorAll('button'));

    rejectBtn.click();
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();

    acceptBtn.click();
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  describe('keyboard focus', () => {
    const tab = (target: HTMLElement, shiftKey = false) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
      );

    const setup = (editorFocus: jest.Mock = jest.fn()) => {
      const widget = new ReviewActionsWidget(euiTheme, buildEditor(editorFocus), 1, {
        onAccept: jest.fn(),
        onReject: jest.fn(),
      });
      const dom = widget.getDomNode();
      document.body.appendChild(dom);
      const [undoButton, replaceButton] = Array.from(dom.querySelectorAll('button'));
      return { widget, dom, undoButton, replaceButton };
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('moves focus from Undo to Replace on Tab and back on Shift+Tab', () => {
      const { widget, dom, undoButton, replaceButton } = setup();

      undoButton.focus();
      tab(undoButton);
      expect(document.activeElement).toBe(replaceButton);

      tab(replaceButton, true);
      expect(document.activeElement).toBe(undoButton);

      dom.remove();
      widget.dispose();
    });

    it('hands focus back to the editor when tabbing out of either end of the toolbar', () => {
      const editorFocus = jest.fn();
      const { widget, dom, undoButton, replaceButton } = setup(editorFocus);

      tab(replaceButton);
      expect(editorFocus).toHaveBeenCalledTimes(1);

      tab(undoButton, true);
      expect(editorFocus).toHaveBeenCalledTimes(2);

      dom.remove();
      widget.dispose();
    });

    it('focuses the Undo button', () => {
      const { widget, dom, undoButton } = setup();

      widget.focus();

      expect(document.activeElement).toBe(undoButton);

      dom.remove();
      widget.dispose();
    });

    it('retries focusing until the widget is rendered', () => {
      jest.useFakeTimers();
      const frames: FrameRequestCallback[] = [];
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
      const { widget, dom, undoButton } = setup();
      const focus = jest
        .spyOn(undoButton, 'focus')
        .mockImplementationOnce(() => {})
        .mockImplementationOnce(() => {})
        .mockImplementation(HTMLElement.prototype.focus);

      widget.focus();
      expect(document.activeElement).not.toBe(undoButton);

      frames.shift()?.(0);
      expect(document.activeElement).not.toBe(undoButton);

      frames.shift()?.(0);
      expect(document.activeElement).toBe(undoButton);
      expect(focus).toHaveBeenCalledTimes(3);
      expect(frames).toHaveLength(0);

      dom.remove();
      widget.dispose();
      jest.useRealTimers();
    });

    it('stops retrying once disposed', () => {
      const cancel = jest.spyOn(window, 'cancelAnimationFrame');
      jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
      const { widget, dom, undoButton } = setup();
      jest.spyOn(undoButton, 'focus').mockImplementation(() => {});

      widget.focus();
      widget.dispose();

      expect(cancel).toHaveBeenCalledWith(42);
      dom.remove();
    });
  });

  it('labels the accept button "Replace" when isReplaceMode is true and "Keep" otherwise', () => {
    const callbacks = { onAccept: jest.fn(), onReject: jest.fn() };

    const keepWidget = new ReviewActionsWidget(euiTheme, buildEditor(), 1, callbacks, false);
    const keepButtons = Array.from(keepWidget.getDomNode().querySelectorAll('button'));
    expect(keepButtons[1].textContent).toMatch(/^Keep/);

    const replaceWidget = new ReviewActionsWidget(euiTheme, buildEditor(), 1, callbacks, true);
    const replaceButtons = Array.from(replaceWidget.getDomNode().querySelectorAll('button'));
    expect(replaceButtons[1].textContent).toMatch(/^Replace/);
  });
});
