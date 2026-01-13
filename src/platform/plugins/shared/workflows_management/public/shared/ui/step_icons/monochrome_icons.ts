/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MonochromeIcons = new Set([
  'manual',
  'alert',
  'scheduled',
  'http',
  'console',
  'if',
  'foreach',
  'parallel',
  'merge',
  'wait',
  // connector icons, which are monochrome and should be colored with currentColor
  '.inference',
  '.email',
  '.gen-ai',
  '.bedrock',
]);
