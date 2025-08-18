/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATA_PATH_ATTRIBUTE_KEY, decodeAttribute } from '@kbn/babel-data-path';
import { transparentize } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { getComponentData } from './get_component_data';
import type {
  CreateHighlightRectangleOptions,
  GetElementFromPointOptions,
  GetInspectedElementOptions,
  HighlightOptions,
  SetHighlightRectangleOptions,
} from './types';

const getElementFromPoint = ({
  event,
  overlay,
}: GetElementFromPointOptions): HTMLElement | undefined => {
  overlay.style.display = 'none';
  /*
    Using elementFromPoint doesn't work for some cases, such as when trying to inspect an svg inside a button.
    So elementsFromPoint is used to get all elements at the point and find the first one that is not the overlay.
  */
  const elements = document.elementsFromPoint(event.clientX, event.clientY) as HTMLElement[];
  overlay.style.display = 'block';

  return elements.find((el) => el !== overlay);
};

const setHighlightRectangle = ({ target, highlight }: SetHighlightRectangleOptions) => {
  const rectangle = target.getBoundingClientRect();
  Object.assign(highlight.style, {
    transform: `translate(${rectangle.left + window.scrollX}px, ${
      rectangle.top + window.scrollY
    }px)`,
    width: `${rectangle.width}px`,
    height: `${rectangle.height}px`,
  });
};

const isSingleQuote = (event: KeyboardEvent) => event.code === 'Quote' || event.key === "'";

export const isKeyboardShortcut = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && isSingleQuote(event);

export const isMac = ((navigator as any)?.userAgentData?.platform || navigator.userAgent)
  .toLowerCase()
  .includes('mac');

export const createInspectOverlay = (euiTheme: EuiThemeComputed) => {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: `calc(${euiTheme.levels.modal} + 1)`,
    cursor: 'crosshair',
    background: transparentize(euiTheme.colors.backgroundFilledText, 0.2),
  });
  return overlay;
};

export const createInspectHighlight = ({ overlay, euiTheme }: HighlightOptions) => {
  const highlight = document.createElement('div');
  Object.assign(highlight.style, {
    position: 'absolute',
    border: `2px solid ${euiTheme.colors.primary}`,
    background: transparentize(euiTheme.colors.primary, 0.3),
  });
  overlay.appendChild(highlight);
  return highlight;
};

export const getInspectedElementData = async ({
  event,
  overlay,
  core,
  setFlyoutRef,
  setIsInspecting,
}: GetInspectedElementOptions) => {
  event.preventDefault();
  event.stopPropagation();

  const target = getElementFromPoint({ event, overlay });

  if (!target) {
    setIsInspecting(false);
    return;
  }

  /*
    If the target doesn't have the data-path attribute, traverse up the DOM tree
    to find the closest element that does.
  */
  let closestElementWithDataPath: HTMLElement | null = target;
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

export const createHighlightRectangle = ({
  event,
  overlay,
  highlight,
}: CreateHighlightRectangleOptions) => {
  const target = getElementFromPoint({ event, overlay });
  if (!target) return;

  setHighlightRectangle({ target, highlight });
};
