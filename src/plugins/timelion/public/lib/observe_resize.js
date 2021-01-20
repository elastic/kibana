/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ($elem, fn, frequency) {
  frequency = frequency || 500;
  let currentHeight = $elem.height();
  let currentWidth = $elem.width();

  let timeout;

  function checkLoop() {
    timeout = setTimeout(function () {
      if (currentHeight !== $elem.height() || currentWidth !== $elem.width()) {
        currentHeight = $elem.height();
        currentWidth = $elem.width();

        if (currentWidth > 0 && currentWidth > 0) fn();
      }
      checkLoop();
    }, frequency);
  }

  checkLoop();

  return function () {
    clearTimeout(timeout);
  };
}
