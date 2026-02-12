/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Liquid } from 'liquidjs';

/**
 * LiquidJS tags supported in workflow templates.
 * Tags not in this set are removed from the engine.
 */
export const LIQUID_ALLOWED_TAGS = new Set([
  'assign',
  'for',
  'capture',
  'case',
  'comment',
  'decrement',
  'increment',
  'cycle',
  'if',
  'unless',
  'break',
  'continue',
  'raw',
  'echo',
  'liquid',
  '#',
]);

/**
 * Removes unsupported tags from a LiquidJS engine instance.
 * Any tag not in {@link LIQUID_ALLOWED_TAGS} is deleted, causing
 * LiquidJS to treat it as an unknown tag (parse error).
 */
export const removeDisallowedLiquidTags = (engine: Liquid): void => {
  for (const tagName of Object.keys(engine.tags)) {
    if (!LIQUID_ALLOWED_TAGS.has(tagName)) {
      delete engine.tags[tagName];
    }
  }
};
