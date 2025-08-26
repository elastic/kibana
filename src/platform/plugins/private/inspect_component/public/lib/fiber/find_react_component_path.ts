/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode } from './types';
import { COMPONENT_PATH_IGNORED_TYPES } from '../constants';
import { getFiberType } from './get_fiber_type';
import { getFiberFromDomElement } from './get_fiber_from_dom_element';

/**
 * Result of {@link findReactComponentPath}.
 */
interface FindReactComponentPathResult {
  /** The component path in the format "SourceComponent : ParentComponent > ChildComponent". */
  path: string | null;
  /** The name of the source component where the path starts. */
  sourceComponent: string;
}

/**
 * Find React component path from DOM element.
 * @param {HTMLElement | SVGElement} domElement The DOM element.
 * @return {FindReactComponentPathResult | undefined} The component path and source component name, or undefined if it cannot be determined.
 */
export const findReactComponentPath = (
  domElement: HTMLElement | SVGElement
): FindReactComponentPathResult | undefined => {
  const path: string[] = [];
  let source: DebugSource | null | undefined;
  let current: HTMLElement | null =
    domElement instanceof HTMLElement ? domElement : domElement.parentElement;

  while (current && source !== null) {
    const fiber = getFiberFromDomElement(current);

    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor && source !== null) {
        const type = getFiberType(fiberCursor);

        if (fiberCursor._debugSource) {
          if (source === undefined) {
            source = fiberCursor._debugSource;
          } else if (source.fileName !== fiberCursor._debugSource.fileName) {
            source = null;
          }
        }

        const oneLetterHtmlTags = ['p', 'b', 'i', 'q', 'u', 's'];
        /** Remove wrappers. */
        if (
          type &&
          !COMPONENT_PATH_IGNORED_TYPES.some((t) => type.includes(t)) &&
          (type.length > 1 || oneLetterHtmlTags.includes(type))
        ) {
          path.push(type);
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }

    current = current.parentElement;
  }

  if (path.length === 0) {
    return undefined;
  }

  if (path.length === 1) {
    return {
      sourceComponent: path[0],
      path: null,
    };
  }

  const [sourceComponent, ...rest] = path.reverse();

  let restItems = rest;

  /**
   * React will always include the literal DOM element rendered, even if it's a component, (e.g. EuiPanel > div).
   * Trim off the DOM element if we have a literal component.
   */
  if (rest.length > 1 && /^[a-z]/.test(rest[rest.length - 1])) {
    restItems = rest.slice(0, -1);
  }

  return {
    path: [sourceComponent + ' : ', ...restItems.join(' > ')].join(''),
    sourceComponent,
  };
};
