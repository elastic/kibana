/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';

/**
 * When using custom fonts with monaco need to call `monaco.editor.remeasureFonts()` when custom fonts finished loading
 * Otherwise initial measurements on fallback font are used which causes visual glitches in the editor
 */
export function remeasureFonts() {
  if ('fonts' in window.document && 'ready' in window.document.fonts) {
    window.document.fonts.ready
      .then(() => {
        monaco.editor.remeasureFonts();
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to remeasureFonts in <CodeEditor/>');
        // eslint-disable-next-line no-console
        console.warn(e);
      });
  }
}
