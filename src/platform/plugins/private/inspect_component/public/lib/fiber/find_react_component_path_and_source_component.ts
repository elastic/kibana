/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactFiberNode, ReactFiberNodeWithDomElement, SourceComponent } from './types';
import { COMPONENT_PATH_IGNORED_TYPES, EUI_MAIN_COMPONENTS, HTML_TAGS } from '../constants';
import { getFiberType } from './get_fiber_type';

/**
 * Result of {@link findReactComponentPathAndSourceComponent}.
 */
interface FindReactComponentPathAndSourceComponentResult {
  /** The component path in the format "SourceComponent : ParentComponent > ChildComponent". */
  path: string | null;
  /** The name of the source component where the path starts. */
  sourceComponent: SourceComponent;
}

const isEui = (input: string) => input.startsWith('Eui');

const isHtmlTag = (tag: string) => HTML_TAGS.includes(tag.toLowerCase());

const isIgnored = (input: string) => COMPONENT_PATH_IGNORED_TYPES.some((t) => input.includes(t));

/**
 * Find React component path and the source component from target Fiber node.
 * @param {ReactFiberNodeWithDomElement} fiberNode The Fiber node.
 * @return {FindReactComponentPathResult | null} The component path and source component name, or null if it cannot be determined.
 */
export const findReactComponentPathAndSourceComponent = (
  fiberNode: ReactFiberNodeWithDomElement
): FindReactComponentPathAndSourceComponentResult | null => {
  const path: string[] = [];
  let current: HTMLElement | null = fiberNode.domElement;
  let firstUserDefinedComponentTypeAndDomElement: SourceComponent | null = null;

  while (current && !firstUserDefinedComponentTypeAndDomElement) {
    let fiberCursor: ReactFiberNode | null | undefined = fiberNode;

    while (fiberCursor && !firstUserDefinedComponentTypeAndDomElement) {
      const type = getFiberType(fiberCursor);
      if (type) {
        if (!isIgnored(type)) {
          path.push(type);
        }
        if (!isHtmlTag(type) && !isEui(type) && !isIgnored(type)) {
          firstUserDefinedComponentTypeAndDomElement = { domElement: current, type };
          break;
        }
      }
      fiberCursor = fiberCursor._debugOwner;
    }

    current = current.parentElement;
  }

  if (path.length === 0 || !firstUserDefinedComponentTypeAndDomElement) {
    return null;
  }

  const reversedPath = path.slice().reverse();
  // Remove source component from the path
  const slicedPath = reversedPath.slice(1);
  const firstUserDefinedComponentTypeIndex = slicedPath.findIndex(
    (component) => component === firstUserDefinedComponentTypeAndDomElement.type
  );
  // Keep everything up to and including lastElementFiberType
  const newPath =
    firstUserDefinedComponentTypeIndex !== -1
      ? slicedPath.slice(0, firstUserDefinedComponentTypeIndex + 1)
      : slicedPath;

  const filteredPath = newPath.filter((component, index) => {
    const isEuiMainComponent = EUI_MAIN_COMPONENTS.includes(component);
    // Spacers only make sense if they are the main component
    if (isEuiMainComponent && component !== 'EuiSpacer') {
      return true;
    } else if (isHtmlTag(component) || isEui(component)) {
      // Keep if it's the first or last component in the path
      // TODO: Handle cases where the last component was an EUI component that can't have children or their children are an internal implementation (e.g EuiButton -> Button) - don't return HTML elements after that.
      return index === 0 || index === newPath.length - 1;
    }
  });

  return {
    path: `${firstUserDefinedComponentTypeAndDomElement.type} : ${filteredPath.join(' > ')}`,
    sourceComponent: firstUserDefinedComponentTypeAndDomElement,
  };
};
