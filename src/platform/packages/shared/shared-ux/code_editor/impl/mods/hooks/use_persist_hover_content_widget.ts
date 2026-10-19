/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco as monacoEditor, type monaco } from '@kbn/monaco';
import { useCallback } from 'react';

/**
 * Default grace margin (px) around the hover widget within which the pointer is treated as heading
 * for the widget rather than away from it.
 * See https://github.com/microsoft/vscode/pull/294091 for the original PR that introduced this value.
 */
const DEFAULT_MONACO_HOVER_KEEP_OPEN_GRACE_PX = 3;

/**
 * Kibana-specific horizontal grace margin (px) around the hover widget within which the pointer is treated as heading
 * for the widget rather than away from it — deliberately far more forgiving than the ±3px
 * Monaco applies at leave time. Specifically needed because we render widgets in a separate DOM node,
 * leveraging the `overflowWidgetsDomNode` portal.
 */
const KIBANA_HOVER_KEEP_OPEN_GRACE_PX = 24;

/**
 * Monaco's own `_onEditorMouseLeave` decides whether to hide the hover widget with a
 * raw, zero-delay pixel hit-test (`isMousePositionWithinElement`, ±3px tolerance) against
 * the widget's last known bounding rect, evaluated the instant the pointer leaves the
 * editor's own bounds. Because the hover widget renders into a separate
 * `overflowWidgetsDomNode` portal (not a descendant of `.monaco-editor`) and usually sits
 * mostly outside the editor's own box, that hit-test typically runs and hides the widget
 * *before* the pointer has traveled far enough to reach it — so reacting to the widget's
 * own `mouseenter` is always too late
 * (see https://github.com/microsoft/vscode/pull/294091, which tightened this same hit-test and
 * made the miss more likely).
 *
 * `shouldKeepOpenOnEditorMouseMoveOrLeave` is a public escape hatch Monaco itself exposes,
 * which VS Code's own accessible-hover view flips while the user
 * is reading a hover via the keyboard. We arm it proactively from `editor.onMouseMove`
 * samples taken *before* the leave event fires, and only while a hover is actually on
 * screen — the move listener is registered when one renders and torn down once it's gone.
 */
export function usePersistHoverContentWidget() {
  return useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable | undefined => {
      const hoverController = editor.getContribution('editor.contrib.contentHover');

      const onHoverContentsChanged = hoverController?._onHoverContentsChanged?.event;

      if (!hoverController || !onHoverContentsChanged) {
        return undefined;
      }

      let armed: monaco.IDisposable | undefined;
      let keepOpenSetByUs = false;

      const setKeepOpen = (keepOpen: boolean) => {
        hoverController.shouldKeepOpenOnEditorMouseMoveOrLeave = keepOpen;
        keepOpenSetByUs = keepOpen;
      };

      const disarm = () => {
        armed?.dispose();
        armed = undefined;

        // we only reset the flag if we set it, especially that we share the flag with Monaco's own accessible-hover view
        if (keepOpenSetByUs) {
          setKeepOpen(false);
        }
      };

      /**
       * The states `_shouldKeepCurrentHover` refuses to dismiss on — Monaco's rule for mouse
       * movement *within* the editor. Only applies where we dismiss something Monaco has no
       * equivalent handler for, since it is more preserving than Monaco's leave-time rule.
       */
      const shouldPreserveHover = () => {
        const contentWidget = hoverController._contentWidget;

        if (!contentWidget) {
          return false;
        }

        const isSticky = editor.getOption(monacoEditor.editor.EditorOption.hover).sticky;

        return Boolean(
          contentWidget.isFocused ||
            contentWidget.isResizing ||
            (isSticky && contentWidget.isVisibleFromKeyboard)
        );
      };

      /**
       * `_shouldKeepHoverWidgetVisible`, the narrower rule Monaco applies when the pointer leaves
       * the editor. Notably it does *not* preserve focused or keyboard-opened hovers — only a
       * resize in progress — so dismissing those on a leave matches Monaco rather than overriding it.
       */
      const shouldPreserveHoverOnLeave = () => Boolean(hoverController._contentWidget?.isResizing);

      const arm = () => {
        const hoverNode = hoverController._contentWidget?.getDomNode();

        // Keyboard-driven hovers are Monaco's to manage: it already keeps them open across mouse
        // movement, and our dismissal paths would only fight that.
        if (armed || !hoverNode || shouldPreserveHover()) {
          return;
        }

        // Monaco reports pointer positions in page coordinates (`posx`/`posy` are `pageX`/
        // `pageY`), so the widget's viewport rect has to be converted to
        // match — comparing the two directly would skew the test by the page's scroll offset.
        // The margin is deliberately asymmetric. Reaching the widget is a vertical move onto
        // something already sitting a few pixels from the pointer's path, so Monaco's own tolerance
        // is enough on the Y axis — widening it would cover the text line itself, such that if there was
        // a neigbouring token the current hover would not be dismissed to reveal the new one.
        const isWithinGraceMargin = (pageX: number, pageY: number) => {
          const rect = hoverNode.getBoundingClientRect();
          const left = rect.left + window.scrollX;
          const top = rect.top + window.scrollY;

          return (
            pageX >= left - KIBANA_HOVER_KEEP_OPEN_GRACE_PX &&
            pageX <= left + rect.width + KIBANA_HOVER_KEEP_OPEN_GRACE_PX &&
            pageY >= top - DEFAULT_MONACO_HOVER_KEEP_OPEN_GRACE_PX &&
            pageY <= top + rect.height + DEFAULT_MONACO_HOVER_KEEP_OPEN_GRACE_PX
          );
        };

        const mouseMoveListener = editor.onMouseMove((e) => {
          // The hover can be dismissed by routes we never see (Escape, scroll, a click). The
          // next move over the editor is both the earliest point that matters and the cheapest
          // place to notice, so tear down here rather than tracking every dismissal path.
          if (!hoverController.isHoverVisible) {
            disarm();
            return;
          }

          setKeepOpen(isWithinGraceMargin(e.event.posx, e.event.posy));
        });

        // Covers the pointer leaving the editor near the widget and then wandering off without
        // ever entering it: the editor's move handler can no longer fire, `mouseleave` never
        // will (nothing was entered), and Monaco won't hide a widget it has been told to keep
        // open — so the tooltip would sit over the page until the pointer came back.
        const onDocumentMouseMove = (event: MouseEvent) => {
          if (!hoverController.isHoverVisible) {
            disarm();
            return;
          }

          if (isWithinGraceMargin(event.pageX, event.pageY)) {
            return;
          }

          // Still inside the editor: defer to the move handler above and Monaco's own hover
          // lifecycle, so moving between tokens isn't interrupted.
          if (editor.getDomNode()?.contains(event.target as Node)) {
            return;
          }

          disarm();

          // The hover was only still open because of our flag — Monaco's leave path short-circuits
          // on it before reaching its own checks. Hiding here just completes what it would have done.
          if (!shouldPreserveHoverOnLeave()) {
            hoverController.hideContentHover();
          }
        };

        document.addEventListener('mousemove', onDocumentMouseMove);

        // Once the pointer genuinely leaves the widget, hide it ourselves — the widget's portal
        // sits outside Monaco's editor-scoped mouse tracking, so nothing else will.
        const onWidgetMouseLeave = () => {
          disarm();

          // A hover the user focused or resized stays until they dismiss it, matching Monaco.
          if (!shouldPreserveHover()) {
            hoverController.hideContentHover();
          }
        };

        hoverNode.addEventListener('mouseleave', onWidgetMouseLeave, { once: true });

        armed = {
          dispose: () => {
            mouseMoveListener.dispose();
            document.removeEventListener('mousemove', onDocumentMouseMove);
            hoverNode.removeEventListener('mouseleave', onWidgetMouseLeave);
          },
        };
      };

      // Monaco reuses one widget instance for the editor's lifetime, so this fires on every
      // hover render, not just the first — `arm` is idempotent while already armed.
      const contentsChangedListener = onHoverContentsChanged(arm);

      return {
        dispose: () => {
          disarm();
          contentsChangedListener.dispose();
        },
      };
    },
    []
  );
}
