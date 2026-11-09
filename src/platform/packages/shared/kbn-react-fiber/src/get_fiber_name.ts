/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactFiberNode } from './types';

const getTypeName = (type: ReactFiberNode['type'] | undefined): string | null => {
  if (!type) return null;
  if (typeof type === 'string') return type;
  if (type.name) return type.name;
  if (type.displayName) return type.displayName;

  // `forwardRef` and `memo` keep the component under `render` and `type` respectively.
  return getTypeName(type.render) ?? getTypeName(type.type);
};

/**
 * Resolves the display name of a fiber: the tag name for host elements, otherwise the
 * component name. Returns null for fibers without a nameable type, e.g. fragments or text.
 */
export const getFiberName = (fiber: ReactFiberNode): string | null =>
  getTypeName(fiber.type) ?? getTypeName(fiber.elementType);
