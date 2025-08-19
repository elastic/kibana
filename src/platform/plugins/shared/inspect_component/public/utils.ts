/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FileInfo,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  ReactFiberNode,
} from './types';
import { getComponentData } from './get_component_data';
import { INSPECT_OVERLAY_ID } from '../common';

const findDebugSourceUpwards = (fiberNode: ReactFiberNode | null | undefined): FileInfo | null => {
  if (!fiberNode) return null;

  if (fiberNode._debugSource) return fiberNode._debugSource;

  return findDebugSourceUpwards(fiberNode._debugOwner);
};

export const getElementFromPoint = ({
  event,
}: GetElementFromPointOptions): HTMLElement | SVGElement | undefined => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === INSPECT_OVERLAY_ID;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg;

    // Skip elements that are not inspectable, overlay, or <path> inside an SVG
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
  setFlyoutRef,
  setIsInspecting,
}: GetInspectedElementOptions) => {
  event.preventDefault();
  event.stopPropagation();

  let fileInfo: FileInfo | null = null;

  const target = getElementFromPoint({ event });

  if (!target) {
    setIsInspecting(false);
    return;
  }

  const reactFiberKey = Object.keys(target).find((key) => key.startsWith('__reactFiber$'));
  const targetReactFiber = reactFiberKey ? target[reactFiberKey] : null;

  if (targetReactFiber) {
    if (targetReactFiber._debugSource) {
      fileInfo = targetReactFiber._debugSource;
    } else {
      const parentDebugSource = findDebugSourceUpwards(targetReactFiber._debugOwner);

      if (parentDebugSource) {
        fileInfo = parentDebugSource;
      } else {
        fileInfo = null;
      }
    }
  }

  if (!fileInfo) {
    setIsInspecting(false);
    return;
  }

  await getComponentData({
    core,
    fileInfo,
    setFlyoutRef,
    setIsInspecting,
  });
};
