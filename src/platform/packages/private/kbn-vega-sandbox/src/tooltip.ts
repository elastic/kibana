/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatValue as createTooltipContent } from 'vega-tooltip';
import type { View } from 'vega';
import type { VegaSandboxTooltipConfig } from './types';

const tooltipId = 'vega-kibana-sandbox-tooltip';

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalizePadding = (padding: VegaSandboxTooltipConfig['padding']): number => {
  if (typeof padding === 'number') {
    return padding;
  }

  if (padding && typeof padding === 'object') {
    return Math.max(padding.left, padding.right, padding.top, padding.bottom);
  }

  return 16;
};

interface VegaTooltipItem {
  bounds: {
    height: () => number;
    width: () => number;
    x1: number;
    y1: number;
  };
}

export class TooltipHandler {
  private readonly centerOnMark: number;
  private readonly padding: number;
  private readonly position: NonNullable<VegaSandboxTooltipConfig['position']>;
  private readonly textTruncate: boolean;

  constructor(private readonly container: HTMLElement, view: View, opts: VegaSandboxTooltipConfig) {
    this.centerOnMark = typeof opts.centerOnMark === 'number' ? opts.centerOnMark : 50;
    this.padding = normalizePadding(opts.padding);
    this.position = opts.position ?? 'top';
    this.textTruncate = Boolean(opts.textTruncate);

    view.tooltip((vegaView, event, item, value) =>
      this.handler(vegaView, event, item as unknown as VegaTooltipItem, value)
    );
  }

  handler(view: View, event: MouseEvent, item: VegaTooltipItem, value: unknown): void {
    this.hideTooltip();

    if (value == null || value === '') {
      return;
    }

    const tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.classList.add('vgaVis__tooltip', `vgaVis__tooltip--${this.position}`);
    tooltip.style.position = 'absolute';
    tooltip.style.pointerEvents = 'none';

    if (this.textTruncate) {
      tooltip.classList.add('vgaVis__tooltip--textTruncate');
    }

    tooltip.textContent = createTooltipContent(value, escapeHtml, 2);
    this.container.appendChild(tooltip);

    const containerBox = this.container.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    const shouldUseCursor =
      item.bounds.width() > this.centerOnMark || item.bounds.height() > this.centerOnMark;

    const [originLeft, originTop] = view.origin();
    const anchorLeft = shouldUseCursor
      ? event.clientX - containerBox.left
      : originLeft + item.bounds.x1 + item.bounds.width() / 2;
    const anchorTop = shouldUseCursor
      ? event.clientY - containerBox.top
      : originTop + item.bounds.y1 + item.bounds.height() / 2;

    const left = Math.min(
      Math.max(this.padding, anchorLeft - tooltipBox.width / 2),
      Math.max(this.padding, containerBox.width - tooltipBox.width - this.padding)
    );
    const top = Math.min(
      Math.max(this.padding, anchorTop - tooltipBox.height - this.padding),
      Math.max(this.padding, containerBox.height - tooltipBox.height - this.padding)
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  hideTooltip(): void {
    document.getElementById(tooltipId)?.remove();
  }
}
