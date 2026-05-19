/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardBackgroundListOption } from './dashboard_background_tokens';

const TWEAKPANE_LIST_SELECT_CLASS = 'tp-lstv_s';
const SWATCH_DATA_ATTR = 'data-dashboard-tweakpane-color-swatch';
const SWATCH_STYLE_ID = 'dashboard-layout-tweakpane-color-swatch-styles';

function parseCssColorToRgb(color: string): { r: number; g: number; b: number } | undefined {
  const normalized = color.trim();
  const hex6 = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (hex6) {
    const h = hex6[1];
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
    };
  }
  const hex3 = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (hex3) {
    const [r, g, b] = hex3[1].split('');
    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
    };
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(normalized);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    };
  }
  return undefined;
}

/** Pick light or dark label color for text on a solid swatch background. */
function getContrastTextColor(backgroundColor: string): string {
  const rgb = parseCssColorToRgb(backgroundColor);
  if (!rgb) {
    return 'inherit';
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? '#000' : '#fff';
}

function ensureSwatchStyles(doc: Document, container: HTMLElement): void {
  if (container.querySelector(`#${SWATCH_STYLE_ID}`)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = SWATCH_STYLE_ID;
  style.textContent = `
    [${SWATCH_DATA_ATTR}] {
      box-sizing: border-box;
      width: 14px;
      height: 14px;
      border-radius: 2px;
      border: 1px solid rgba(128, 128, 128, 0.35);
      flex-shrink: 0;
    }
    .tp-lstv:has([${SWATCH_DATA_ATTR}]) {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tp-lstv:has([${SWATCH_DATA_ATTR}]) .${TWEAKPANE_LIST_SELECT_CLASS} {
      flex: 1;
      min-width: 0;
    }
  `;
  container.appendChild(style);
}

function getOrCreatePreviewSwatch(listView: HTMLElement, doc: Document): HTMLElement {
  const existing = listView.querySelector<HTMLElement>(`[${SWATCH_DATA_ATTR}]`);
  if (existing) {
    return existing;
  }
  const swatch = doc.createElement('span');
  swatch.setAttribute(SWATCH_DATA_ATTR, 'true');
  swatch.setAttribute('aria-hidden', 'true');
  listView.insertBefore(swatch, listView.firstChild);
  return swatch;
}

/**
 * Tweakpane list bindings only support plain-text `<option>` labels. This helper
 * paints each option with its resolved EUI color and adds a small preview swatch
 * beside the closed select for the current value.
 */
export function applyDashboardLayoutTweakpaneColorListSwatches(
  bindingElement: HTMLElement,
  options: readonly DashboardBackgroundListOption[],
  selectedValue: string
): void {
  const doc = bindingElement.ownerDocument;
  const select = bindingElement.querySelector<HTMLSelectElement>(`.${TWEAKPANE_LIST_SELECT_CLASS}`);
  const listView = select?.parentElement;
  if (!select || !listView) {
    return;
  }

  const paneRoot =
    bindingElement.closest('[data-test-subj="dashboardLayoutTweakpane"]') ?? bindingElement;
  ensureSwatchStyles(doc, paneRoot as HTMLElement);

  const colorByValue = new Map(options.map((o) => [o.value, o.color]));

  Array.from(select.options).forEach((optionElem, index) => {
    const item = options[index];
    if (!item) {
      return;
    }
    optionElem.style.backgroundColor = item.color;
    optionElem.style.color = getContrastTextColor(item.color);
  });

  const previewSwatch = getOrCreatePreviewSwatch(listView, doc);
  const selectedColor = colorByValue.get(selectedValue) ?? options[0]?.color ?? 'transparent';
  previewSwatch.style.backgroundColor = selectedColor;
}
