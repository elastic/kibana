/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EUI_COMPONENT_PREFIX,
  IGNORED_COMPONENT_NAMES,
  IGNORED_COMPONENT_NAME_PARTS,
  LEGACY_ROOT_TAG,
} from './constants';
import { getFiberName } from './get_fiber_name';
import type { ReactFiberNode, ReactFiberRoot } from './types';

/** Host fibers back DOM elements, their type is the tag name. */
export const isHostFiber = (fiber: ReactFiberNode): boolean => typeof fiber.type === 'string';

/** Whether a root was created with `ReactDOM.render` rather than `createRoot`. */
export const isLegacyRoot = (root: ReactFiberRoot): boolean => root.tag === LEGACY_ROOT_TAG;

const isComponentType = (type: ReactFiberNode['type'] | undefined): boolean => {
  if (!type || typeof type === 'string') return false;
  if (typeof type === 'function') return true;

  return isComponentType(type.render) || isComponentType(type.type);
};

/**
 * Whether the fiber backs a function or class component, named or not, including the ones
 * wrapped in `memo` or `forwardRef`. Context providers, fragments and other built-ins are not.
 */
export const isComponentFiber = (fiber: ReactFiberNode): boolean => isComponentType(fiber.type);

export const isEuiComponentName = (name: string): boolean => name.startsWith(EUI_COMPONENT_PREFIX);

export const isIgnoredComponentName = (name: string): boolean =>
  IGNORED_COMPONENT_NAMES.includes(name) ||
  IGNORED_COMPONENT_NAME_PARTS.some((part) => name.includes(part));

/**
 * Whether the fiber is an application component, i.e. not a host element,
 * an EUI component or one of the ignored wrappers.
 */
export const isSourceComponent = (fiber: ReactFiberNode): boolean => {
  if (isHostFiber(fiber)) return false;

  const name = getFiberName(fiber);

  return name !== null && !isEuiComponentName(name) && !isIgnoredComponentName(name);
};
