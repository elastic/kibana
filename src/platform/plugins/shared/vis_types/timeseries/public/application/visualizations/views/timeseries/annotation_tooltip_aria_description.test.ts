/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  syncAnnotationTooltipAriaDescription,
  ANNOTATION_MARKER_SELECTOR,
} from './annotation_tooltip_aria_description';

const createMarker = (): HTMLButtonElement => {
  const marker = document.createElement('button');
  marker.className = ANNOTATION_MARKER_SELECTOR.slice(1);
  marker.type = 'button';
  marker.textContent = 'annotation';
  return marker;
};

const createTooltipPortal = ({ hidden = false }: { hidden?: boolean } = {}): HTMLElement => {
  const portal = document.createElement('div');
  portal.className = hidden ? 'echTooltipPortal__invisible' : 'echTooltipPortal';

  const tooltip = document.createElement('div');
  tooltip.className = 'echTooltip echAnnotation';
  tooltip.textContent = 'Tooltip details';
  portal.appendChild(tooltip);

  document.body.appendChild(portal);

  return tooltip;
};

describe('annotation_tooltip_aria_description', () => {
  const tooltipId = 'tsvbAnnotationTooltip';

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('links the focused marker to the visible annotation tooltip', () => {
    const chartContainer = document.createElement('div');
    const marker = createMarker();

    chartContainer.appendChild(marker);
    document.body.appendChild(chartContainer);
    const tooltip = createTooltipPortal();

    marker.focus();
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(marker).toHaveAttribute('aria-describedby', tooltipId);
    expect(tooltip).toHaveAttribute('id', tooltipId);
  });

  it('removes the generated description from markers that are no longer focused', () => {
    const chartContainer = document.createElement('div');
    const previousMarker = createMarker();
    const focusedMarker = createMarker();

    previousMarker.setAttribute('aria-describedby', `existing ${tooltipId}`);
    focusedMarker.setAttribute('aria-describedby', 'existing');

    chartContainer.appendChild(previousMarker);
    chartContainer.appendChild(focusedMarker);
    document.body.appendChild(chartContainer);
    createTooltipPortal();

    focusedMarker.focus();
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(previousMarker).toHaveAttribute('aria-describedby', 'existing');
    expect(focusedMarker).toHaveAttribute('aria-describedby', `existing ${tooltipId}`);
  });

  it('adds aria-describedby when tooltip appears after marker is already focused', () => {
    const chartContainer = document.createElement('div');
    const marker = createMarker();

    chartContainer.appendChild(marker);
    document.body.appendChild(chartContainer);

    marker.focus();
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(marker).not.toHaveAttribute('aria-describedby');

    const tooltip = createTooltipPortal();
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(marker).toHaveAttribute('aria-describedby', tooltipId);
    expect(tooltip).toHaveAttribute('id', tooltipId);
  });

  it('cleans up aria-describedby from all markers when focus leaves', () => {
    const chartContainer = document.createElement('div');
    const marker1 = createMarker();
    const marker2 = createMarker();

    marker1.setAttribute('aria-describedby', tooltipId);
    marker2.setAttribute('aria-describedby', `existing ${tooltipId}`);

    chartContainer.appendChild(marker1);
    chartContainer.appendChild(marker2);
    document.body.appendChild(chartContainer);
    createTooltipPortal();

    // Focus is on document.body (no marker focused)
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(marker1).not.toHaveAttribute('aria-describedby');
    expect(marker2).toHaveAttribute('aria-describedby', 'existing');
  });

  it('does not attach aria-describedby when the annotation tooltip is hidden', () => {
    const chartContainer = document.createElement('div');
    const marker = createMarker();

    chartContainer.appendChild(marker);
    document.body.appendChild(chartContainer);
    createTooltipPortal({ hidden: true });

    marker.focus();
    syncAnnotationTooltipAriaDescription(chartContainer, tooltipId);

    expect(marker).not.toHaveAttribute('aria-describedby');
  });
});
