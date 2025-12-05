/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEui, isHtmlTag, isExcludedComponent } from '../utils';
import { getFiberType } from './get_fiber_type';
import type { ReactFiberNode, SourceComponent } from './types';

/**
 * Finds the {@link SourceComponent source component} for a {@link ReactFiberNode React Fiber node}.
 * @param {ReactFiberNode} fiber The {@link ReactFiberNode React Fiber node} to start the search from.
 * @return {SourceComponent | null} {@link SourceComponent Source component}, or null if it cannot be determined.
 */
export const findSourceComponent = (fiber: ReactFiberNode): SourceComponent | null => {
  let current: HTMLElement | null = fiber.element ?? null;
  let sourceComponent: SourceComponent | null = null;

  while (current && !sourceComponent) {
    let fiberCursor: ReactFiberNode | null | undefined = fiber;

    while (fiberCursor && !sourceComponent) {
      const type = getFiberType(fiberCursor);

      if (type) {
        if (!isHtmlTag(type) && !isEui(type) && !isExcludedComponent(type)) {
          sourceComponent = { element: current, type };
          break;
        }
      }
      fiberCursor = fiberCursor._debugOwner ?? fiberCursor.return;
    }

    current = current.parentElement;
  }
  return sourceComponent;
};
