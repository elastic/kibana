/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR } from '../constants';

/**
 * Copy pixel data from all canvas elements in the original tree to their
 * corresponding clones. cloneNode does not preserve canvas content.
 */
const copyCanvasContent = (original: HTMLElement, clone: HTMLElement): void => {
  const origCanvases = original.tagName === 'CANVAS'
    ? [original as HTMLCanvasElement]
    : Array.from(original.querySelectorAll('canvas'));
  const cloneCanvases = clone.tagName === 'CANVAS'
    ? [clone as HTMLCanvasElement]
    : Array.from(clone.querySelectorAll('canvas'));

  for (let i = 0; i < origCanvases.length; i++) {
    const ctx = cloneCanvases[i]?.getContext('2d');
    if (ctx) {
      ctx.drawImage(origCanvases[i], 0, 0);
    }
  }
};

// CSS properties that are inherited by default and may be lost when the clone
// is moved to document.body (away from its original parent context).
const INHERITED_PROPS = [
  'color', 'cursor', 'direction', 'font', 'font-family', 'font-feature-settings',
  'font-kerning', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style',
  'font-variant', 'font-variation-settings', 'font-weight', 'letter-spacing',
  'line-height', 'text-align', 'text-indent', 'text-transform', 'visibility',
  'white-space', 'white-space-collapse', 'word-break', 'word-spacing',
  'writing-mode', '-webkit-font-smoothing', '-webkit-text-fill-color',
  '-webkit-text-stroke', 'text-rendering',
];

/**
 * Copy inherited CSS properties and CSS custom properties from the original
 * element's computed style to the clone. These are the only values lost when
 * the clone is moved to document.body — class-based rules (Emotion, etc.)
 * still apply since they're in <head>.
 */
const copyInheritedStyles = (target: HTMLElement, clone: HTMLElement): void => {
  const computed = getComputedStyle(target);

  // Copy inherited properties
  for (const prop of INHERITED_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  // Copy CSS custom properties (--*) which may be set by ancestor elements
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop.startsWith('--')) {
      clone.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }
};

/**
 * Create a fixed-position clone of an element. The clone keeps its original
 * classes so Emotion/CSS rules apply naturally. Only inherited CSS properties
 * and custom properties are copied from the computed style.
 */
export const cloneElement = (
  target: HTMLElement,
  zIndex: number
): { clone: HTMLElement; rect: DOMRect } => {
  const rect = target.getBoundingClientRect();
  const clone = target.cloneNode(true) as HTMLElement;

  // cloneNode doesn't copy canvas pixel data — copy it manually
  copyCanvasContent(target, clone);

  // Copy only inherited and custom properties — layout/box styles come from class rules
  copyInheritedStyles(target, clone);

  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.zIndex = String(zIndex);
  clone.style.pointerEvents = 'none';
  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.visibility = 'visible';
  clone.setAttribute(DEVTOOL_CLONE_ATTR, '');

  return { clone, rect };
};
