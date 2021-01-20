/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get, throttle } from 'lodash';

// eslint-disable-next-line import/no-default-export
export default function (editor: any) {
  const resize = editor.resize;

  const throttledResize = throttle(() => {
    resize.call(editor, false);

    // Keep current top line in view when resizing to avoid losing user context
    const userRow = get(throttledResize, 'topRow', 0);
    if (userRow !== 0) {
      editor.renderer.scrollToLine(userRow, false, false, () => {});
    }
  }, 35);
  return throttledResize;
}
