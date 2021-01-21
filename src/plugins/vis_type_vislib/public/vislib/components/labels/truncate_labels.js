/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import $ from 'jquery';
import d3 from 'd3';

/***
 *
 * @param text (d3 node containing text)
 * @param size (number of characters to leave)
 * @returns {text} the updated text
 */
const truncateLabel = function (text, size) {
  const node = d3.select(text).node();
  const str = $(node).text();
  if (size === 0) return str;
  if (size >= str.length) return str;
  return str.substr(0, size) + '…';
};

export { truncateLabel };
