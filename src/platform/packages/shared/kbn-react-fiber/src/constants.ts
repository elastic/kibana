/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Prefix of the property under which React stores a DOM node's fiber. */
export const FIBER_KEY_PREFIX = '__reactFiber$';

/** `tag` of the topmost fiber of a tree, whose `stateNode` is the root. */
export const HOST_ROOT_TAG = 3;

/** `tag` of a root created with `ReactDOM.render`, `createRoot` ones have `1`. */
export const LEGACY_ROOT_TAG = 0;

export const EUI_COMPONENT_PREFIX = 'Eui';

/**
 * Names of components that never identify an application component: react-router's `Route` and
 * the `@kbn/shared-ux-router` wrapper of the same name run render props written by the component
 * rendering them. Matched as a whole, so that application components such as `DiscoverMainRoute`
 * keep their frames.
 */
export const IGNORED_COMPONENT_NAMES = ['Route'];

/**
 * Substrings of component names that never identify an application component:
 * higher order components, Emotion wrappers and i18n internals.
 */
export const IGNORED_COMPONENT_NAME_PARTS = [
  'Emotion',
  'ConnectFunction',
  '_',
  'EuiI18n',
  'Wrapper',
];
