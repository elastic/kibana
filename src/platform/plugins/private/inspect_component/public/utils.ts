/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import type {
  FileData,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  ReactFiberNode,
  SetElementHighlightOptions,
} from './types';
import { getComponentData } from './get_component_data';
import { EUI_DATA_ICON_TYPE } from './constants';

const isSingleQuote = (event: KeyboardEvent) => event.code === 'Quote' || event.key === "'";

const getFiberFromDomNode = (node: HTMLElement | SVGElement): ReactFiberNode | undefined => {
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (node as any)[fiberKey] : undefined;
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

export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);

export const isMac = ((navigator as any)?.userAgentData?.platform || navigator.userAgent)
  .toLowerCase()
  .includes('mac');

export const setElementHighlight = ({ target, euiTheme }: SetElementHighlightOptions) => {
  const rect = target.getBoundingClientRect();
  const isPortal = Boolean(target.closest('[data-euiportal="true"]'));

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'absolute',
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    zIndex: isPortal ? Number(euiTheme.levels.modal) + 1 : Number(euiTheme.levels.flyout) - 1,
  });

  document.body.appendChild(overlay);

  return () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
};

export const getInspectedElementData = async ({
  event,
  core,
  overlayId,
  euiTheme,
  setFlyoutRef,
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

  await getComponentData({
    core,
    fileData,
    iconType: iconType || undefined,
    target,
    euiTheme,
    setFlyoutRef,
    setIsInspecting,
  });
};
