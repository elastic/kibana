/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { monaco } from '@kbn/monaco';

/** Keeps the find widget close tooltip from wrapping over its button. */
export const useFindWidgetHoverLabelCompact = (
  editor: monaco.editor.IStandaloneCodeEditor | null
): void => {
  useEffect(() => {
    if (!editor) {
      return;
    }

    const container = editor.getContainerDomNode();
    const controller = editor.getContribution('editor.contrib.findController');

    if (!container || !controller?._hoverService) {
      return;
    }

    const keepLabelOnOneLine = () => {
      const closeButton = controller._widget?._closeBtn?.domNode;

      if (!closeButton) {
        return;
      }

      const entry = controller._hoverService?._hoverStack?.find(
        ({ options }) => options.target === closeButton
      );

      const label = entry?.hover.domNode.querySelector<HTMLElement>('.hover-contents');

      // Monaco sets pre-wrap inline on the label, so changing its parent has no effect.
      if (label && label.style.whiteSpace !== 'nowrap') {
        label.style.whiteSpace = 'nowrap';
      }
    };

    // The hover service creates a new tooltip on each appearance without exposing an event.
    // Observe only this editor while Find is open, then resolve the tooltip via its contribution.
    const observer = new MutationObserver(keepLabelOnOneLine);
    const state = controller.getState();

    const updateObserver = () => {
      observer.disconnect();
      if (state.isRevealed) {
        observer.observe(container, { childList: true, subtree: true });
        keepLabelOnOneLine();
      }
    };

    const subscription = state.onFindReplaceStateChange((event) => {
      if (event.isRevealed) {
        updateObserver();
      }
    });

    updateObserver();

    return () => {
      observer.disconnect();
      subscription.dispose();
    };
  }, [editor]);
};
