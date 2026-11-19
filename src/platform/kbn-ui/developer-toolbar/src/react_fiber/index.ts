/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Vendored copy of `@kbn/react-fiber` (`src/platform/packages/shared/kbn-react-fiber`) at
 * `28ca927b2ae7`. kbn-ui packages may only import `@kbn/i18n` and `@kbn/i18n-react`, and the
 * standalone tarball cannot bundle a shared Kibana package, so the helpers are copied with their
 * file and export names unchanged: every other source file in this directory is identical to
 * upstream's `src/`, this file only differs in its import paths. Keep in sync with upstream; switching to
 * the real package is a one-line import change once it becomes portable.
 */

export type {
  ComponentStackFrame,
  DebugSource,
  ElementFiber,
  FiberComponentType,
  ReactFiberNode,
  ReactFiberRoot,
} from './types';

export { getDebugSource } from './get_debug_source';
export { getFiberFromElement } from './get_fiber_from_element';
export { getFiberName } from './get_fiber_name';
export { getFiberRoot } from './get_fiber_root';
export { getOwnerChain } from './get_owner_chain';
export {
  isComponentFiber,
  isEuiComponentName,
  isHostFiber,
  isIgnoredComponentName,
  isLegacyRoot,
  isSourceComponent,
} from './predicates';

export { isRenderedWithin } from './is_rendered_within';
export { findFiberWithDebugSource } from './find_fiber_with_debug_source';
export { findSourceComponentName } from './find_source_component_name';
export { findEuiComponentName } from './find_eui_component_name';
export { ANONYMOUS_COMPONENT_NAME, getComponentStack } from './get_component_stack';
