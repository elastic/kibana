/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const RAF_TIMEOUT = 100;

/**
 * Schedule a callback to be invoked after the browser paints a new frame.
 *
 * There are multiple ways to do this like double rAF, MessageChannel, But we
 * use the requestAnimationFrame + setTimeout
 *
 * Also, RAF does not fire if the current tab is not visible, so we schedule a
 * timeout in parallel to ensure the callback is invoked
 *
 * Based on the  code from preact!
 * https://github.com/preactjs/preact/blob/f6577c495306f1e93174d69bd79f9fb8a418da75/hooks/src/index.js#L285-L297
 */
export default function afterFrame(callback: () => void) {
  const handler = () => {
    clearTimeout(timeout);
    cancelAnimationFrame(raf);
    setTimeout(callback);
  };
  const timeout = setTimeout(handler, RAF_TIMEOUT);

  const raf = requestAnimationFrame(handler);
}
