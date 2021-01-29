/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Using a random color generator presented awful colors and unpredictable color schemes.
 * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
 * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
 */
export const seedColors: string[] = [
  '#00a69b',
  '#57c17b',
  '#6f87d8',
  '#663db8',
  '#bc52bc',
  '#9e3533',
  '#daa05d',
];
