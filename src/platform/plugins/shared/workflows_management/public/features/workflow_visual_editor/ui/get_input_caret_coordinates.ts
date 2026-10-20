/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface InputCaretCoordinates {
  /** Distance from the input's top border edge to the caret (includes scroll). */
  readonly top: number;
  /** Distance from the input's left border edge to the caret (includes scroll). */
  readonly left: number;
  readonly height: number;
}

/**
 * Properties copied onto the mirror so caret metrics match the real control.
 * Based on the textarea-caret / component approach.
 */
const MIRROR_STYLE_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
  'whiteSpace',
  'wordBreak',
  'wordWrap',
] as const;

/**
 * Returns caret pixel coordinates relative to the input/textarea element so a
 * floating UI (e.g. Insert data popover) can sit under the typed `@` / `{{`.
 */
export function getInputCaretCoordinates(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number
): InputCaretCoordinates {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, left: 0, height: 0 };
  }

  const isInput = element.nodeName === 'INPUT';
  const computed = window.getComputedStyle(element);
  const mirror = document.createElement('div');
  mirror.id = 'workflow-input-caret-mirror';

  // Mirror sits off-screen; inputs wrap to a single long line.
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = isInput ? 'pre' : 'pre-wrap';
  if (isInput) {
    mirror.style.wordWrap = 'normal';
  }

  for (const prop of MIRROR_STYLE_PROPS) {
    // Style declaration keys match the camelCase list above.
    (mirror.style as unknown as Record<string, string>)[prop] = computed[
      prop as keyof CSSStyleDeclaration
    ] as string;
  }

  mirror.textContent = element.value.substring(0, position);
  if (isInput && mirror.textContent) {
    // Spaces collapse in some browsers unless replaced for measurement.
    mirror.textContent = mirror.textContent.replace(/\s/g, '\u00a0');
  }

  const marker = document.createElement('span');
  // Trailing newline needs a marker so height is correct.
  marker.textContent = element.value.substring(position) || '.';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  // Match scroll so wrapped lines above the viewport still measure correctly.
  mirror.scrollTop = element.scrollTop;
  mirror.scrollLeft = element.scrollLeft;

  const coordinates: InputCaretCoordinates = {
    top: marker.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: marker.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10) || marker.offsetHeight,
  };

  document.body.removeChild(mirror);
  return coordinates;
}
