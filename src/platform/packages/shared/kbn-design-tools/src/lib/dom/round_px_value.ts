/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Round fractional pixel values in a CSS string to whole numbers.
 * e.g. "12.345px" → "12px", "10px 20.7px" → "10px 21px"
 */
export const roundPxValue = (value: string): string =>
  value.replace(/(\d+\.\d+)px/g, (_m, n) => `${Math.round(parseFloat(n))}px`);
