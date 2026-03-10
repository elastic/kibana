/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ANNOTATION_MARKER_SELECTOR = '.echAnnotation__marker';
export const ANNOTATION_TOOLTIP_SELECTOR = '.echTooltip.echAnnotation';

const getAriaDescribedByIds = (element: HTMLElement): string[] =>
  element.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];

const updateAriaDescribedBy = (
  element: HTMLElement,
  tooltipId: string,
  operation: 'add' | 'remove'
): void => {
  const describedByIds = getAriaDescribedByIds(element);
  const nextIds =
    operation === 'add'
      ? Array.from(new Set([...describedByIds, tooltipId]))
      : describedByIds.filter((value) => value !== tooltipId);

  if (nextIds.length > 0) {
    element.setAttribute('aria-describedby', nextIds.join(' '));
    return;
  }

  element.removeAttribute('aria-describedby');
};

const getFocusedAnnotationMarker = (chartContainer: HTMLElement): HTMLButtonElement | null => {
  const { activeElement } = chartContainer.ownerDocument;

  if (
    !(activeElement instanceof HTMLButtonElement) ||
    !chartContainer.contains(activeElement) ||
    !activeElement.matches(ANNOTATION_MARKER_SELECTOR)
  ) {
    return null;
  }

  return activeElement;
};

const getVisibleAnnotationTooltip = (document: Document): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>(ANNOTATION_TOOLTIP_SELECTOR)).find(
    (tooltip) => !tooltip.closest('.echTooltipPortal__invisible')
  ) ?? null;

export const syncAnnotationTooltipAriaDescription = (
  chartContainer: HTMLElement,
  tooltipId: string
): void => {
  const markers = Array.from(
    chartContainer.querySelectorAll<HTMLButtonElement>(ANNOTATION_MARKER_SELECTOR)
  );
  const focusedMarker = getFocusedAnnotationMarker(chartContainer);

  markers.forEach((marker) => {
    if (marker !== focusedMarker) {
      updateAriaDescribedBy(marker, tooltipId, 'remove');
    }
  });

  if (!focusedMarker) {
    return;
  }

  const tooltip = getVisibleAnnotationTooltip(chartContainer.ownerDocument);

  if (!tooltip) {
    updateAriaDescribedBy(focusedMarker, tooltipId, 'remove');
    return;
  }

  tooltip.id = tooltipId;
  updateAriaDescribedBy(focusedMarker, tooltipId, 'add');
};
