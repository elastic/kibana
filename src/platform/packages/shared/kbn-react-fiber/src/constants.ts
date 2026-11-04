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

export const EUI_COMPONENT_PREFIX = 'Eui';

/**
 * Substrings of component names that never identify an application component:
 * higher order components, Emotion wrappers, router and i18n internals.
 */
export const IGNORED_COMPONENT_NAME_PARTS = [
  'Emotion',
  'ConnectFunction',
  '_',
  'EuiI18n',
  'Route',
  'Wrapper',
];
