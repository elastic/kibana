/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FileData,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  ReactFiberNode,
  SetElementHighlightOptions,
} from './types';
import { getComponentData } from './get_component_data';
import { EUI_DATA_ICON_TYPE } from './constants';

const getFiberFromDomNode = (node: HTMLElement | SVGElement): ReactFiberNode | undefined => {
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (node as any)[fiberKey] : undefined;
};

const getFiberType = (fiber: ReactFiberNode): string | null => {
  if (typeof fiber.type === 'string') {
    return fiber.type;
  } else if (typeof fiber.type?.name === 'string') {
    return fiber.type?.name;
  } else if (typeof fiber.type?.displayName === 'string') {
    return fiber.type?.displayName;
  } else if (typeof fiber.elementType === 'string') {
    return fiber.elementType;
  }

  return null;
};

// TODO - this logic probably needs some work.
export const findReactComponentPath = (node: HTMLElement | SVGElement) => {
  const path: string[] = [];
  let source: FileData | null | undefined;
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current && source !== null) {
    const fiber = getFiberFromDomNode(current);

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

        // Emotion injects a lot of wrapper components, so we need to filter them out.
        if (type && !type.startsWith('Emotion')) {
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

  // React will always include the literal DOM node rendered, even if it's a
  // component, (e.g. EuiPanel > div).  Trim off the DOM node if we have a literal
  // component.
  if (rest.length > 1 && /^[a-z]/.test(rest[rest.length - 1])) {
    restItems = rest.slice(0, -1);
  }

  return {
    path: [sourceComponent + ' : ', ...restItems.join(' > ')].join(''),
    sourceComponent,
  };
};

const findDebugSource = (node: HTMLElement | SVGElement): FileData | undefined => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current) {
    const fiber = getFiberFromDomNode(current);
    if (fiber) {
      // Traverse fiber chain to find _debugSource
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (fiberCursor._debugSource) {
          return fiberCursor._debugSource;
        }
        fiberCursor = fiberCursor._debugOwner;
      }
    }

    // Move up the DOM tree - this is necessary to find the fiber node on third-party components
    current = current.parentElement;
  }

  return;
};

export const getElementFromPoint = ({
  event,
  overlayId,
}: GetElementFromPointOptions): HTMLElement | SVGElement | undefined => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === overlayId;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg; // There is some edge case with SVG elements that are not inspectable

    if (isNotInspectable || isOverlay || isPath) continue;

    return el;
  }

  return undefined;
};

const isSingleQuote = (event: KeyboardEvent) => event.code === 'Quote' || event.key === "'";

export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);

export const isMac = ((navigator as any)?.userAgentData?.platform || navigator.userAgent)
  .toLowerCase()
  .includes('mac');

export const getInspectedElementData = async ({
  event,
  core,
  overlayId,
  euiTheme,
  setFlyoutRef,
  setIsInspecting,
  sourceComponent,
}: GetInspectedElementOptions) => {
  event.preventDefault();
  event.stopPropagation();

  const target = getElementFromPoint({ event, overlayId });

  if (!target) {
    setIsInspecting(false);
    return;
  }

  const fileData = findDebugSource(target);

  if (!fileData) {
    setIsInspecting(false);
    return;
  }

  const iconType =
    target instanceof SVGElement
      ? target.getAttribute(EUI_DATA_ICON_TYPE)
      : target.querySelector('svg')?.getAttribute(EUI_DATA_ICON_TYPE);

  await getComponentData({
    core,
    fileData,
    iconType: iconType || undefined,
    target,
    euiTheme,
    setFlyoutRef,
    setIsInspecting,
    sourceComponent,
  });
};

export const setElementHighlight = ({ target, euiTheme }: SetElementHighlightOptions) => {
  const originalStyles = {
    border: target.style.border,
  };

  target.style.border = `2px solid ${euiTheme.colors.primary}`;

  return () => {
    target.style.border = originalStyles.border;
  };
};
