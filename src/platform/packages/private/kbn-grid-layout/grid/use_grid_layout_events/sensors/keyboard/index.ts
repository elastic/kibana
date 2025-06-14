/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserKeyboardEvent } from './types';

export { startKeyboardInteraction } from './keyboard';
export const isKeyboardEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserKeyboardEvent => {
  return 'key' in e;
};

// Returns the top/left coordinates of the currently focused element for the keyboard sensor calculations
export const getElementPosition = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) {
    throw new Error('No valid target element found');
  }
  const { left: clientX, top: clientY } = target.getBoundingClientRect() || {
    left: 0,
    top: 0,
  };
  return { clientX, clientY };
};
