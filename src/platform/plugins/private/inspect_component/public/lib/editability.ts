/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactFiberNode } from './fiber/types';

export type EditabilityReason =
  | 'no_debug_source'
  | 'in_node_modules'
  | 'host_primitive'
  | 'fragment';

export type EditabilityResult = { editable: true } | { editable: false; reason: EditabilityReason };

/**
 * Determines whether a fiber's props can be edited by the inspector.
 *
 * Returns editable:false for fibers defined in node_modules, host DOM tags,
 * Fragments, or anything missing _debugSource.
 */
export const getEditability = (fiber: ReactFiberNode): EditabilityResult => {
  if (!fiber._debugSource) {
    return { editable: false, reason: 'no_debug_source' };
  }

  const { fileName } = fiber._debugSource;

  // node_modules check covers both direct installs and symlinked packages that
  // happen to live outside the repo root but are resolved through node_modules.
  if (fileName.includes('/node_modules/') || fileName.includes('\\node_modules\\')) {
    return { editable: false, reason: 'in_node_modules' };
  }

  // Host primitives are plain DOM tags — their type is a string like 'div'.
  if (typeof fiber.type === 'string') {
    return { editable: false, reason: 'host_primitive' };
  }

  // React.Fragment has a Symbol type.
  if (typeof fiber.type === 'symbol') {
    return { editable: false, reason: 'fragment' };
  }

  return { editable: true };
};
