/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EUI_COMPONENTS_DOCS_MAP, EUI_DATA_ICON_TYPE, EUI_DOCS_BASE } from './constants';
import { getComponentData } from './get_component_data';
import type {
  EuiInfo,
  FileData,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  ReactFiberNode,
} from './types';

export const isMac = ((navigator as any)?.userAgentData?.platform || navigator.userAgent)
  .toLowerCase()
  .includes('mac');

const extractEuiComponentsFromPath = (value: string): string[] => {
  if (!value) return [];

  const euiComponentPart = value.includes(':') ? value.split(':').slice(1).join(':') : value;

  return euiComponentPart
    .split('>')
    .map((t) => t.trim())
    .filter((t) => t.startsWith('Eui'));
};

const findDebugSource = (node: HTMLElement | SVGElement): FileData | undefined => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current) {
    const fiber = getFiberFromDomNode(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (fiberCursor._debugSource) {
          return fiberCursor._debugSource;
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }
    current = current.parentElement;
  }
  return;
};

/**
 * Find React component path from DOM node.
 * This logic is not perfect and may not work in all cases.
 */
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

        /** Emotion injects a lot of wrapper components, so we need to filter them out. */
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

  /**
   * React will always include the literal DOM node rendered, even if it's a component, (e.g. EuiPanel > div).
   * Trim off the DOM node if we have a literal component.
   */
  if (rest.length > 1 && /^[a-z]/.test(rest[rest.length - 1])) {
    restItems = rest.slice(0, -1);
  }

  return {
    path: [sourceComponent + ' : ', ...restItems.join(' > ')].join(''),
    sourceComponent,
  };
};

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

export const getElementFromPoint = ({
  event,
  overlayId,
}: GetElementFromPointOptions): HTMLElement | SVGElement | undefined => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === overlayId;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    /** There is some edge case with SVG elements that are not inspectable. */
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg;

    if (isNotInspectable || isOverlay || isPath) continue;

    return el;
  }

  return undefined;
};

export const getEuiComponentDocsInfo = (componentPath?: string): EuiInfo | null => {
  if (!componentPath) return null;

  const toUrl = (name: string): string | null => {
    const docsLink = EUI_COMPONENTS_DOCS_MAP.get(name);

    if (!docsLink) return null;

    return `${EUI_DOCS_BASE}${docsLink}`;
  };

  const candidates = extractEuiComponentsFromPath(componentPath);

  if (candidates.length === 0 && componentPath.startsWith('Eui')) {
    candidates.push(componentPath);
  }

  for (const candidate of candidates) {
    const exactUrl = toUrl(candidate);

    if (exactUrl) return { componentName: candidate, docsLink: exactUrl };
  }

  return null;
};

export const getInspectedElementData = async ({
  componentPath,
  core,
  event,
  overlayId,
  sourceComponent,
  setFlyoutOverlayRef,
  setIsInspecting,
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

  const euiDocsInfo = getEuiComponentDocsInfo(componentPath);

  await getComponentData({
    core,
    euiInfo: {
      componentName: euiDocsInfo?.componentName || 'N/A',
      docsLink: euiDocsInfo?.docsLink || `${EUI_DOCS_BASE}/components`,
    },
    fileData,
    iconType: iconType || undefined,
    sourceComponent,
    target,
    setFlyoutOverlayRef,
    setIsInspecting,
  });
};

const isSingleQuote = (event: KeyboardEvent) => event.code === 'Quote' || event.key === "'";

export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);
