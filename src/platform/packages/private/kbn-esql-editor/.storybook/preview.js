/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const parameters = {
  viewMode: 'docs',
  previewTabs: {
    canvas: { hidden: true },
  },
};

// Monaco sets z-index inline via JS; injecting a stylesheet with !important overrides it.
// The overflow widgets container must sit above EUI's flyout level (1000).
export const decorators = [
  (story) => {
    if (typeof document !== 'undefined' && !document.getElementById('esql-monaco-zindex-fix')) {
      const style = document.createElement('style');
      style.id = 'esql-monaco-zindex-fix';
      style.textContent =
        '.monaco-editor.monaco-editor-overflowing-widgets-container { z-index: 1100 !important; }';
      document.head.appendChild(style);
    }
    return story();
  },
];
