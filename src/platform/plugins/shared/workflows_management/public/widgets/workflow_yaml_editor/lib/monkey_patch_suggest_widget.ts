/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

// Store references needed for reset
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let suggestWidget: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let patchedDetailsOverlay: any = null;
let originalDetailsVisible: boolean | undefined;
let originalPlaceAtAnchor: ((anchor: HTMLElement, preferAlignAtTop: boolean) => void) | null = null;

/**
 * Monkey-patch the suggestions widget:
 *  - make details always visible
 *  - make details overlay always appear at the top, aligned with the suggestion list
 * @param editor - The Monaco editor instance
 */
export const monkeyPatchSuggestWidget = (editor: monaco.editor.IStandaloneCodeEditor) => {
  // Hack to make suggestions details visible by default
  // https://github.com/microsoft/monaco-editor/issues/2241#issuecomment-997339142
  const contribution = editor.getContribution('editor.contrib.suggestController');
  if (contribution) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widget = (contribution as any).widget;
    suggestWidget = widget.value;
    if (suggestWidget && suggestWidget._setDetailsVisible) {
      // This will default to visible details. But when user switches it off
      // they will remain switched off:
      originalDetailsVisible = suggestWidget._isDetailsVisible();
      suggestWidget._setDetailsVisible(true);
    }
    // Make the details overlay always appear at the top, aligned with the suggestion list
    if (suggestWidget && suggestWidget._details) {
      const detailsOverlay = suggestWidget._details;
      // Store references for reset
      patchedDetailsOverlay = detailsOverlay;
      originalPlaceAtAnchor = detailsOverlay.placeAtAnchor.bind(detailsOverlay);
      // Override placeAtAnchor to always pass true for preferAlignAtTop
      detailsOverlay.placeAtAnchor = function (anchor: HTMLElement, _preferAlignAtTop: boolean) {
        originalPlaceAtAnchor?.(anchor, true); // Force preferAlignAtTop to true for always aligning at the top
      };
    }
  }
};

/**
 * Reset the monkey-patching applied to the suggestions widget.
 * Call this in the unmounting effect to restore original behavior.
 */
export const resetSuggestWidgetPatch = () => {
  if (suggestWidget && patchedDetailsOverlay && originalPlaceAtAnchor) {
    suggestWidget._setDetailsVisible(originalDetailsVisible);
    patchedDetailsOverlay.placeAtAnchor = originalPlaceAtAnchor;
    patchedDetailsOverlay = null;
    originalPlaceAtAnchor = null;
  }
};
