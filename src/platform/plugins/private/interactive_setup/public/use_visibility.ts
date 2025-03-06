/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useRef } from 'react';

export type VisibilityReturnTuple<T> = [boolean, RefObject<T>];

export function useVisibility<T extends HTMLElement>(): VisibilityReturnTuple<T> {
  const elementRef = useRef<T>(null);

  // When an element is hidden using `display: none` or `hidden` attribute it has no offset parent.
  return [!!elementRef.current?.offsetParent, elementRef];
}
