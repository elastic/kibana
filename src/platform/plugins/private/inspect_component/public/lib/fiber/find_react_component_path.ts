/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

const HTML_TAGS = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
];

const isHtmlTag = (tag: string) => HTML_TAGS.includes(tag.toLowerCase());

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
  const lastElement = domElement instanceof HTMLElement ? domElement : domElement.parentElement;
  let lastElementFiberType: string | null = null;
  let current: HTMLElement | null = lastElement;
  let firstUserDefinedComponent: string | null = null;

  while (current && !firstUserDefinedComponent) {
    const fiber = getFiberFromDomElement(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor && !firstUserDefinedComponent) {
        const type = getFiberType(fiberCursor);

        if (type) {
          if (!lastElementFiberType && fiberCursor._debugSource) {
            lastElementFiberType = type;
          }
          if (!isIgnored(type)) {
            path.push(type);
          }
          if (!isHtmlTag(type) && !isEui(type) && !isIgnored(type)) {
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

  const reversedPath = path.slice().reverse();
  // Remove firstUserDefinedComponent
  const slicedPath = reversedPath.slice(1);
  const lastElementFiberTypeIndex = slicedPath.findIndex(
    (component) => component === lastElementFiberType
  );
  // Keep everything up to and including lastElementFiberType
  const newPath =
    lastElementFiberTypeIndex !== -1
      ? slicedPath.slice(0, lastElementFiberTypeIndex + 1)
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
    path: [firstUserDefinedComponent + ' : ', ...filteredPath.join(' > ')].join(''),
    sourceComponent: firstUserDefinedComponent ? firstUserDefinedComponent : path[0],
  };
};
