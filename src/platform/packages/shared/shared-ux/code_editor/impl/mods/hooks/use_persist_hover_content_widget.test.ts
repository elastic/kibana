/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/monaco';
import { usePersistHoverContentWidget } from './use_persist_hover_content_widget';

interface HarnessOptions {
  isFocused?: boolean;
  isResizing?: boolean;
  isVisibleFromKeyboard?: boolean;
  sticky?: boolean;
}

// The hover widget sits at 100,100 and is 200x100, so 150,150 is inside it and 1000,1000 is
// well beyond the grace margin. jsdom reports no scroll offset, so page and viewport coords match.
const WIDGET_RECT = { left: 100, top: 100, width: 200, height: 100 };
const INSIDE_GRACE = { posx: 150, posy: 150 };
const OUTSIDE_GRACE = { posx: 1000, posy: 1000 };

const createHarness = ({
  isFocused = false,
  isResizing = false,
  isVisibleFromKeyboard = false,
  sticky = true,
}: HarnessOptions = {}) => {
  const hideContentHover = jest.fn();
  let contentsChangedListener: (() => void) | undefined;
  let editorMouseMoveListener:
    | ((event: { event: { posx: number; posy: number } }) => void)
    | undefined;

  const editorDomNode = document.createElement('div');
  const hoverNode = document.createElement('div');
  hoverNode.getBoundingClientRect = () => WIDGET_RECT as DOMRect;

  const contentWidget = {
    getDomNode: () => hoverNode,
    isFocused,
    isResizing,
    isVisibleFromKeyboard,
  };

  const controller = {
    shouldKeepOpenOnEditorMouseMoveOrLeave: false,
    hideContentHover,
    isHoverVisible: true,
    _onHoverContentsChanged: {
      event: (listener: () => void) => {
        contentsChangedListener = listener;
        return { dispose: jest.fn() };
      },
    },
    _contentWidget: contentWidget,
  };

  const editor = {
    getContribution: (id: string) =>
      id === 'editor.contrib.contentHover' ? controller : undefined,
    onMouseMove: (listener: (event: { event: { posx: number; posy: number } }) => void) => {
      editorMouseMoveListener = listener;
      return { dispose: jest.fn() };
    },
    getDomNode: () => editorDomNode,
    getOption: () => ({ sticky }),
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  const install = () => {
    const { result } = renderHook(() => usePersistHoverContentWidget());
    return result.current(editor);
  };

  return {
    editor,
    controller,
    contentWidget,
    hoverNode,
    hideContentHover,
    install,
    showHover: () => contentsChangedListener?.(),
    moveWithinEditor: (position: { posx: number; posy: number }) =>
      editorMouseMoveListener?.({ event: position }),
    isArmed: () => editorMouseMoveListener !== undefined,
    movePointerAwayFromEditor: () => {
      const event = new MouseEvent('mousemove', { bubbles: true });
      Object.defineProperty(event, 'pageX', { value: OUTSIDE_GRACE.posx });
      Object.defineProperty(event, 'pageY', { value: OUTSIDE_GRACE.posy });
      document.dispatchEvent(event);
    },
    leaveWidget: () => hoverNode.dispatchEvent(new MouseEvent('mouseleave')),
  };
};

describe('usePersistHoverContentWidget', () => {
  describe('mouse-driven hovers', () => {
    it('keeps the hover open while the pointer is within the grace margin of the widget', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.moveWithinEditor(INSIDE_GRACE);
      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(true);

      harness.moveWithinEditor(OUTSIDE_GRACE);
      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(false);
    });

    it('dismisses the hover once the pointer leaves the editor and the grace margin', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.movePointerAwayFromEditor();

      expect(harness.hideContentHover).toHaveBeenCalled();
    });

    it('dismisses the hover when the pointer leaves the widget itself', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.leaveWidget();

      expect(harness.hideContentHover).toHaveBeenCalled();
    });
  });

  describe('the grace margin', () => {
    const OFFSET = 15;
    const RIGHT_OF_WIDGET = WIDGET_RECT.left + WIDGET_RECT.width + OFFSET;
    const BELOW_WIDGET = WIDGET_RECT.top + WIDGET_RECT.height + OFFSET;
    const keepOpen = (harness: ReturnType<typeof createHarness>) =>
      harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave;

    it('is forgiving horizontally but not vertically, for the same offset', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      // Reaching the widget is a vertical move, so the widget already sits within a few pixels
      // of the pointer's path; the slack is needed for sideways drift along the way.
      harness.moveWithinEditor({ posx: RIGHT_OF_WIDGET, posy: INSIDE_GRACE.posy });
      expect(keepOpen(harness)).toBe(true);

      harness.moveWithinEditor({ posx: INSIDE_GRACE.posx, posy: BELOW_WIDGET });
      expect(keepOpen(harness)).toBe(false);
    });

    it('releases the hover for a token on the line below the widget', () => {
      // Covers the case where for example hovering `ABS(` then moving to `ACOS(` in an example ES|QL string  `EVAL col0 = ABS(ACOS(30))`, should dismiss the hover.
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.moveWithinEditor({ posx: INSIDE_GRACE.posx, posy: BELOW_WIDGET });

      expect(keepOpen(harness)).toBe(false);
    });
  });

  describe('hovers Monaco preserves', () => {
    it('does not engage for a keyboard-opened hover', () => {
      const harness = createHarness({ isVisibleFromKeyboard: true, sticky: true });
      harness.install();
      harness.showHover();

      expect(harness.isArmed()).toBe(false);

      harness.movePointerAwayFromEditor();
      expect(harness.hideContentHover).not.toHaveBeenCalled();
    });

    it('engages for a keyboard-opened hover when sticky is off, which Monaco does not preserve', () => {
      const harness = createHarness({ isVisibleFromKeyboard: true, sticky: false });
      harness.install();
      harness.showHover();

      expect(harness.isArmed()).toBe(true);
    });

    it('does not dismiss a focused hover when the pointer leaves the widget', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      // Focus is acquired after the hover opened — e.g. the user clicked in to select text.
      harness.contentWidget.isFocused = true;

      harness.leaveWidget();
      expect(harness.hideContentHover).not.toHaveBeenCalled();
    });

    it('still dismisses a focused hover once the pointer leaves the editor, as Monaco would', () => {
      // `_shouldKeepHoverWidgetVisible` — Monaco's leave-time rule — does not consult `isFocused`,
      // so preserving here would be more conservative than Monaco itself.
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.contentWidget.isFocused = true;

      harness.movePointerAwayFromEditor();
      expect(harness.hideContentHover).toHaveBeenCalled();
    });

    it('does not dismiss a hover that is being resized when the pointer leaves the widget', () => {
      // Dragging outward fast lets the pointer outrun the widget, firing `mouseleave` mid-resize.
      // The pointer never reaches the document handler during a resize: it is on the widget's own
      // edge, so the grace check returns first.
      const harness = createHarness();
      harness.install();
      harness.showHover();

      harness.contentWidget.isResizing = true;

      harness.leaveWidget();
      expect(harness.hideContentHover).not.toHaveBeenCalled();
    });

    it('keeps the hover open while the pointer is on the widget edge, as during a resize', () => {
      const harness = createHarness();
      harness.install();
      harness.showHover();

      // The sash sits on the widget's boundary, which is inside the grace margin.
      harness.moveWithinEditor({ posx: WIDGET_RECT.left, posy: WIDGET_RECT.top });

      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(true);
    });
  });

  describe('the shared keep-open flag', () => {
    it('leaves a flag it did not set alone', () => {
      // Monaco's accessible-hover view owns this flag while the user reads a hover via the
      // keyboard, so disposing must not clear a value someone else set.
      const harness = createHarness({ isVisibleFromKeyboard: true, sticky: true });
      const subscription = harness.install();
      harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave = true;

      harness.showHover();
      subscription?.dispose();

      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(true);
    });

    it('clears a flag it set itself', () => {
      const harness = createHarness();
      const subscription = harness.install();
      harness.showHover();

      harness.moveWithinEditor(INSIDE_GRACE);
      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(true);

      subscription?.dispose();
      expect(harness.controller.shouldKeepOpenOnEditorMouseMoveOrLeave).toBe(false);
    });
  });
});
