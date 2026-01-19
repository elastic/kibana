/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const POSSIBLE_LOCALHOST_VALUES: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '0000:0000:0000:0000:0000:0000:0000:0000',
];

export const isLocalhost = (hostname: string): boolean => {
  return POSSIBLE_LOCALHOST_VALUES.includes(hostname.toLowerCase());
};
