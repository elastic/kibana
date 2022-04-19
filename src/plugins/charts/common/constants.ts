/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Currently supported palettes. This list might be extended dynamically in a later release
export const paletteIds = [
  'default',
  'kibana_palette',
  'custom',
  'status',
  'temperature',
  'complimentary',
  'negative',
  'positive',
  'cool',
  'warm',
  'gray',
];

// This set of defaults originated in Canvas, which, at present, is the primary
// consumer of this function.  Changing this default requires a change in Canvas
// logic, which would likely be a breaking change in 7.x.
export const defaultCustomColors = [
  '#882E72',
  '#B178A6',
  '#D6C1DE',
  '#1965B0',
  '#5289C7',
  '#7BAFDE',
  '#4EB265',
  '#90C987',
  '#CAE0AB',
  '#F7EE55',
  '#F6C141',
  '#F1932D',
  '#E8601C',
  '#DC050C',
];
