/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This is a hard-coded list that can be removed when each of these "share-capable" object types are changed to be shareable.
 * Note, this list does not preclude other object types from being made shareable in the future, it just consists of the object types that
 * we are working towards making shareable in the near term.
 *
 * This is purely for changing the tooltip in the Saved Object Management UI, it's not used anywhere else.
 */
export const SHAREABLE_SOON_OBJECT_TYPES = [
  'tag',
  'dashboard',
  'canvas-workpad',
  'canvas-element',
  'lens',
  'visualization',
  'map',
  'graph-workspace',
  'search',
  'query',
  'rule',
  'connector',
];
