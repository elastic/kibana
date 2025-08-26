/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import type { ReactFiberNode } from './types';
import { COMPONENT_PATH_IGNORED_TYPES, EUI_MAIN_COMPONENTS } from '../constants';
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

const isEui = (input: string) => input.startsWith('Eui');

const isHtmlElement = (input: ComponentType | string) =>
  typeof input === 'string' && /^[a-z]+$/.test(input);

const isIgnored = (input: string) => COMPONENT_PATH_IGNORED_TYPES.some((t) => input.includes(t));

/**
 * Find React component path from DOM element.
 * @param {HTMLElement | SVGElement} domElement The DOM element.
 * @return {FindReactComponentPathResult | undefined} The component path and source component name, or undefined if it cannot be determined.
 */
export const findReactComponentPath = (
  domElement: HTMLElement | SVGElement
): FindReactComponentPathResult | undefined => {
  const path: string[] = [];
  let current: HTMLElement | null =
    domElement instanceof HTMLElement ? domElement : domElement.parentElement;
  let firstUserDefinedComponent: string | null = null;

  while (current && !firstUserDefinedComponent) {
    const fiber = getFiberFromDomElement(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor && !firstUserDefinedComponent) {
        const type = getFiberType(fiberCursor);

        if (type) {
          if (!isIgnored(type)) {
            path.push(type);
          }
          if (!isHtmlElement(type) && !isEui(type) && !isIgnored(type)) {
            firstUserDefinedComponent = type;
          }
        }
        fiberCursor = fiberCursor._debugOwner;
      }
    }

    current = current.parentElement;
  }

  if (path.length === 0) {
    return undefined;
  }

  if (path.length === 1 && firstUserDefinedComponent) {
    return {
      sourceComponent: firstUserDefinedComponent,
      path: null,
    };
  }

  const reversedPath = path.reverse().slice(1);

  const filteredPath = reversedPath.filter((component, index) => {
    const isEuiMainComponent = EUI_MAIN_COMPONENTS.includes(component);
    if (isEuiMainComponent) {
      return true;
    } else if (isHtmlElement(component) || isEui(component)) {
      // Keep if it's the first or last component in the path
      // TODO: Handle cases where the last component was an EUI component that can't have children - don't return HTML elements after that
      return index === 0 || index === reversedPath.length - 1;
    }
  });

  return {
    path: [firstUserDefinedComponent + ' : ', ...filteredPath.join(' > ')].join(''),
    sourceComponent: firstUserDefinedComponent ? firstUserDefinedComponent : path[0],
  };
};
