/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// use a buffer to start rendering more documents before the user completely scrolles down
const verticalScrollBuffer = 100;

/**
 * Helper function to determine if the next patch of 50 documents should be loaded
 */
export function shouldLoadNextDocPatch(domEl: HTMLElement) {
  // the height of the scrolling div, including content not visible on the screen due to overflow.
  const scrollHeight = domEl.scrollHeight;
  // the number of pixels that the div is is scrolled vertically
  const scrollTop = domEl.scrollTop;
  // the inner height of the scrolling div, excluding content that's visible on the screen
  const clientHeight = domEl.clientHeight;

  const consumedHeight = scrollTop + clientHeight;
  const remainingHeight = scrollHeight - consumedHeight;
  return remainingHeight < verticalScrollBuffer;
}
