/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const COMMA_SEPARATOR_RE = /(\d)(?=(\d{3})+(?!\d))/g;

/**
 * Converts a number to a string and adds commas
 * as thousands separators
 */
export const formatNumWithCommas = (input: number) =>
  String(input).replace(COMMA_SEPARATOR_RE, '$1,');
