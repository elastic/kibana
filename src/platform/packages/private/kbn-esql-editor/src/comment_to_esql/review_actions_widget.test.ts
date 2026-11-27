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
  }) as unknown as monaco.editor.ICodeEditor;

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

    it('lets the browser move focus out of the toolbar when tabbing past either end', () => {
      const editorFocus = jest.fn();
      const { widget, dom, undoButton, replaceButton } = setup(editorFocus);

      const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      const backward = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      const stopForward = jest.spyOn(forward, 'stopPropagation');
      const stopBackward = jest.spyOn(backward, 'stopPropagation');

      replaceButton.dispatchEvent(forward);
      undoButton.dispatchEvent(backward);

      expect(forward.defaultPrevented).toBe(false);
      expect(backward.defaultPrevented).toBe(false);
      expect(stopForward).toHaveBeenCalled();
      expect(stopBackward).toHaveBeenCalled();
      expect(editorFocus).not.toHaveBeenCalled();

      dom.remove();
      widget.dispose();
    });

    it('focuses Undo only once Monaco has rendered the widget', () => {
      const { widget, dom, undoButton } = setup();

      widget.focus();
      expect(document.activeElement).not.toBe(undoButton);

      widget.afterRender(null);
      expect(document.activeElement).not.toBe(undoButton);

      widget.afterRender(0);
      expect(document.activeElement).toBe(undoButton);

      dom.remove();
      widget.dispose();
    });

    it('does not steal focus on later renders', () => {
      const { widget, dom, undoButton, replaceButton } = setup();

      widget.focus();
      widget.afterRender(0);
      replaceButton.focus();
      widget.afterRender(0);

      expect(document.activeElement).toBe(replaceButton);
      expect(document.activeElement).not.toBe(undoButton);

      dom.remove();
      widget.dispose();
    });

    it.each([
      ['Undo', 0],
      ['Replace', 1],
    ])('returns focus to the editor when disposed while %s has focus', (_, buttonIndex) => {
      const editorFocus = jest.fn();
      const { widget, dom, undoButton, replaceButton } = setup(editorFocus);

      [undoButton, replaceButton][buttonIndex].focus();
      widget.dispose();

      expect(editorFocus).toHaveBeenCalledTimes(1);
      dom.remove();
    });

    it('does not move focus to the editor when disposed while focus is elsewhere', () => {
      const editorFocus = jest.fn();
      const { widget, dom } = setup(editorFocus);
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();

      widget.dispose();

      expect(editorFocus).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(outside);
      outside.remove();
      dom.remove();
    });

    it('does not move focus to the editor when disposed before ever being focused', () => {
      const editorFocus = jest.fn();
      const { widget, dom } = setup(editorFocus);

      widget.dispose();

      expect(editorFocus).not.toHaveBeenCalled();
      dom.remove();
    });

    it('does not focus after being disposed', () => {
      const { widget, dom, undoButton } = setup();

      widget.focus();
      widget.dispose();
      widget.afterRender(0);

      expect(document.activeElement).not.toBe(undoButton);
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
