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
import type { ReactFiberNode, ReactFiberNodeWithHtmlElement, SourceComponent } from './types';

/**
 * Find the source component from target Fiber node.
 * @param {ReactFiberNodeWithHtmlElement} fiberNode The Fiber node.
 * @return {SourceComponent | null} The source component, or null if it cannot be determined.
 */
export const findSourceComponent = (
  fiberNode: ReactFiberNodeWithHtmlElement
): SourceComponent | null => {
  let current: HTMLElement | null = fiberNode.element;
  let sourceComponent: SourceComponent | null = null;

  while (current && !sourceComponent) {
    let fiberCursor: ReactFiberNode | null | undefined = fiberNode;

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
