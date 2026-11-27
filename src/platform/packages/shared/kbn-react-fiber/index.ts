/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ComponentStackFrame,
  DebugSource,
  ElementFiber,
  FiberComponentType,
  ReactFiberNode,
  ReactFiberRoot,
} from './src/types';

export { getDebugSource } from './src/get_debug_source';
export { getFiberFromElement } from './src/get_fiber_from_element';
export { getFiberName } from './src/get_fiber_name';
export { getFiberRoot } from './src/get_fiber_root';
export { getOwnerChain } from './src/get_owner_chain';
export {
  isComponentFiber,
  isEuiComponentName,
  isHostFiber,
  isIgnoredComponentName,
  isLegacyRoot,
  isSourceComponent,
} from './src/predicates';

export { isRenderedWithin } from './src/is_rendered_within';
export { findFiberWithDebugSource } from './src/find_fiber_with_debug_source';
export { findSourceComponentName } from './src/find_source_component_name';
export { findEuiComponentName } from './src/find_eui_component_name';
export { ANONYMOUS_COMPONENT_NAME, getComponentStack } from './src/get_component_stack';
