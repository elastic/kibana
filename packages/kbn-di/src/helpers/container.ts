/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InjectionContainer } from '../types';

export function getContainerRoot<Container extends InjectionContainer>(container: Container) {
  let current = container;
  while (!current.isRoot()) {
    current = current.getParent()! as Container;
  }
  return current;
}
