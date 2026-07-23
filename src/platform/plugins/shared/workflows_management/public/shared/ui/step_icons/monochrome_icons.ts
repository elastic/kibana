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
  'console',
  'if',
  'foreach',
  'parallel',
  'merge',
  'wait',
  'workflow.execute',
  'workflow.executeAsync',
  'workflow.output',
  'workflow.fail',
  'while',
  // base-type step glyphs: dedicated SVGs with no fill (default black) — must use mask+currentColor
  'data.set',
  'switch',
  'waitForInput',
  'waitForApproval',
  // base-type steps that fall back to the generic plugs.svg (also no fill)
  'http',
  // loop control steps use controls.svg (no fill → black): must use mask+currentColor
  'loop.break',
  'loop.continue',
  // connector icons, which are monochrome and should be colored with currentColor
  '.http',
  '.inference',
  '.email',
  '.gen-ai',
  '.bedrock',
]);
