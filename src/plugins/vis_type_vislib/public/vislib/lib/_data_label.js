/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';
/**
 * Creates a string based on the hex color passed in
 *
 * @method dataLabel
 * @param d {Object} object to wrap in d3.select
 * @returns {string} label value
 */
export function dataLabel(selection, label) {
  d3.select(selection).attr('data-label', label);
}
