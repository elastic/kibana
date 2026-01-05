/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

/**
 * Adjust the suggestions widget:
 *  - for details to always be visible
 *  - for the widget to be wider: by default 500x500px
 *  - for the details overlay to always appear at the top, aligned with the suggestion list
 * @param editor - The Monaco editor instance
 */
export const adjustSuggestWidget = (editor: monaco.editor.IStandaloneCodeEditor) => {
  // Hack to make suggestions details visible by default
  // https://github.com/microsoft/monaco-editor/issues/2241#issuecomment-997339142
  const contribution = editor.getContribution('editor.contrib.suggestController');
  if (contribution) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widget = (contribution as any).widget;
    const suggestWidget = widget.value;
    if (suggestWidget && suggestWidget._setDetailsVisible) {
      // This will default to visible details. But when user switches it off
      // they will remain switched off:
      suggestWidget._setDetailsVisible(true);
    }
    // Make the suggestions widget larger by default (500x500px) to include long suggestions
    if (suggestWidget && suggestWidget._persistedSize) {
      suggestWidget._persistedSize.store({ width: 500, height: 500 });
    }

    // Make the details overlay always appear at the top, aligned with the suggestion list
    if (suggestWidget && suggestWidget._details) {
      const detailsOverlay = suggestWidget._details;
      // Override placeAtAnchor to always pass true for preferAlignAtTop
      const originalPlaceAtAnchor = detailsOverlay.placeAtAnchor.bind(detailsOverlay);
      detailsOverlay.placeAtAnchor = function (anchor: HTMLElement, _preferAlignAtTop: boolean) {
        originalPlaceAtAnchor(anchor, true); // Force preferAlignAtTop to true for always aligning at the top
      };
    }
  }
};
