/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATA_PATH_ATTRIBUTE_KEY, decodeAttribute } from '@kbn/babel-data-path';
import { INSPECT_OVERLAY_ID } from '../common';
import { getComponentData } from './get_component_data';
import type { GetElementFromPointOptions, GetInspectedElementOptions } from './types';

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

  const target = getElementFromPoint({ event });

  if (!target) {
    setIsInspecting(false);
    return;
  }

  /*
    If the target doesn't have the data-path attribute, traverse up the DOM tree
    to find the closest element that does.
  */
  let closestElementWithDataPath: HTMLElement | SVGElement | null = target;
  while (
    closestElementWithDataPath &&
    !closestElementWithDataPath.hasAttribute(DATA_PATH_ATTRIBUTE_KEY)
  ) {
    closestElementWithDataPath = closestElementWithDataPath.parentElement;
  }

  if (!closestElementWithDataPath) {
    setIsInspecting(false);
    return;
  }

  const dataAttribute = closestElementWithDataPath.getAttribute(DATA_PATH_ATTRIBUTE_KEY);

  if (!dataAttribute) {
    setIsInspecting(false);
    return;
  }

  const path = decodeAttribute(dataAttribute);

  if (!path) {
    setIsInspecting(false);
    return;
  }

  await getComponentData({
    core,
    path,
    setFlyoutRef,
    setIsInspecting,
  });
};
