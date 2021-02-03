/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/**
 * just a place to put feature detection checks
 */
export const supportsCssFilters = (function () {
  const e = document.createElement('img');
  const rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
  const test = 'grayscale(1)';

  rules.forEach(function (rule) {
    e.style[rule] = test;
  });

  document.body.appendChild(e);
  const styles = window.getComputedStyle(e);
  const can = _(styles).pick(rules).includes(test);
  document.body.removeChild(e);

  return can;
})();
