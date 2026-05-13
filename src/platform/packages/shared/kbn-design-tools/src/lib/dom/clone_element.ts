/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_MANAGED_ATTR,
  TRUNCATION_CLASSES,
  INHERITED_CSS_PROPS,
  NON_INHERITED_VISUAL_CSS_PROPS,
  BACKGROUND_CSS_PROPS,
} from '../constants';

/**
 * Set a CSS property with `!important` priority.
 *
 * Cloned elements retain their original CSS classes, which may include
 * Emotion-generated rules that use `!important` (e.g. EUI's euiCard__icon
 * sets a centering transform). Plain inline style assignments are silently
 * overridden by those rules, so we must use `setProperty` with the
 * `'important'` priority flag to guarantee our values win.
 */
export const setImportant = (el: HTMLElement, prop: string, value: string): void => {
  el.style.setProperty(prop, value, 'important');
};

/**
 * Round a DOMRect's position and size to whole pixels.
 * Subpixel values from getBoundingClientRect() place elements between pixel
 * boundaries, forcing the browser to anti-alias text and causing blur.
 * Position (left/top) uses Math.round; dimensions (width/height) use
 * Math.ceil so content never gets clipped by rounding down.
 */
export const roundRect = (rect: DOMRect): DOMRect => {
  const x = Math.round(rect.left);
  const y = Math.round(rect.top);
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);
  return {
    x,
    y,
    left: x,
    top: y,
    width: w,
    height: h,
    right: x + w,
    bottom: y + h,
    toJSON() {},
  } as DOMRect;
};

/**
 * Copy pixel data from all canvas elements in the original tree to their
 * corresponding clones. cloneNode does not preserve canvas content.
 */
export const copyCanvasContent = (original: HTMLElement, clone: HTMLElement): void => {
  const origCanvases =
    original.tagName === 'CANVAS'
      ? [original as HTMLCanvasElement]
      : Array.from(original.querySelectorAll('canvas'));
  const cloneCanvases =
    clone.tagName === 'CANVAS'
      ? [clone as HTMLCanvasElement]
      : Array.from(clone.querySelectorAll('canvas'));

  for (let i = 0; i < origCanvases.length; i++) {
    const cloneCanvas = cloneCanvases[i];
    const ctx = cloneCanvas?.getContext('2d');
    if (ctx) {
      cloneCanvas.width = origCanvases[i].width;
      cloneCanvas.height = origCanvases[i].height;
      ctx.drawImage(origCanvases[i], 0, 0);
    }
  }
};

/**
 * Round a CSS pixel value to a whole number to prevent subpixel text rendering.
 * Non-px values (e.g. "normal", "inherit") are returned unchanged.
 */
const roundPx = (value: string): string => {
  if (value.endsWith('px')) {
    return `${Math.round(parseFloat(value))}px`;
  }
  return value;
};

/** Properties whose subpixel computed values cause blurry text rendering. */
const ROUND_PX_PROPS = new Set(['font-size', 'line-height', 'letter-spacing', 'word-spacing']);

const copyInheritedStyles = (target: HTMLElement, clone: HTMLElement): void => {
  const computed = getComputedStyle(target);

  for (const prop of INHERITED_CSS_PROPS) {
    const value = computed.getPropertyValue(prop);
    clone.style.setProperty(prop, ROUND_PX_PROPS.has(prop) ? roundPx(value) : value);
  }

  // Preserve non-inherited visual styles
  for (const prop of NON_INHERITED_VISUAL_CSS_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  // Copy backgrounds only when the element is not in an interactive
  // pseudo-class state, so we capture the resting appearance.
  // Always copy for replaced/media elements — they don't change
  // background on hover, and their background-color is often used as
  // a fill behind semi-transparent content (e.g. SVG icons).
  const isReplacedElement = /^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/.test(target.tagName);
  if (isReplacedElement || !target.matches(':hover, :focus, :active')) {
    for (const prop of BACKGROUND_CSS_PROPS) {
      clone.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }

  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop.startsWith('--')) {
      clone.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }
};

/**
 * Replicate a pseudo-element's visual appearance on the clone via an
 * injected inline <style> rule. Pseudo-elements aren't part of the DOM
 * and cloneNode does not copy them.
 */
const applyPseudoStyle = (
  original: HTMLElement,
  clone: HTMLElement,
  pseudo: '::before' | '::after'
): void => {
  const computed = getComputedStyle(original, pseudo);
  const content = computed.getPropertyValue('content');

  if (!content || content === 'none' || content === 'normal') {
    return;
  }

  const isInteractive = original.matches(':hover, :focus, :active');

  const className = `__pseudo_${Math.random().toString(36).slice(2, 8)}`;
  clone.classList.add(className);

  const rules: string[] = [`content: ${content};`];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop === 'content') continue;
    // Skip background props for hovered elements — the CSS class on the
    // clone provides the correct resting-state appearance.
    if (isInteractive && BACKGROUND_CSS_PROPS.has(prop)) continue;
    rules.push(`${prop}: ${computed.getPropertyValue(prop)};`);
  }

  const style = document.createElement('style');
  style.textContent = `.${className}${pseudo} { ${rules.join(' ')} }`;
  clone.appendChild(style);
};

/**
 * Recursively copy inherited styles, pseudo-elements, and freeze layout
 * dimensions from the original tree to the clone tree in a single pass.
 */
export const copyStylesDeep = (
  original: HTMLElement,
  clone: HTMLElement,
  isRoot = true,
  depth = 0
): void => {
  if (depth > MAX_DEPTH) return;
  copyInheritedStyles(original, clone);
  applyPseudoStyle(original, clone, '::before');
  applyPseudoStyle(original, clone, '::after');

  let hadTruncationClass = false;
  for (const cls of TRUNCATION_CLASSES) {
    if (clone.classList.contains(cls)) {
      clone.classList.remove(cls);
      hadTruncationClass = true;
    }
  }

  if (!isRoot && !hadTruncationClass) {
    const rounded = roundRect(original.getBoundingClientRect());
    clone.style.width = `${rounded.width}px`;
    clone.style.height = `${rounded.height}px`;
    clone.style.boxSizing = 'border-box';
  }

  const origChildren = original.children;
  const cloneChildren = clone.children;

  for (let i = 0; i < origChildren.length; i++) {
    const origChild = origChildren[i];
    const cloneChild = cloneChildren[i];
    if (origChild instanceof HTMLElement && cloneChild instanceof HTMLElement) {
      copyStylesDeep(origChild, cloneChild, false, depth + 1);
    }
  }
};

/**
 * Create a fixed-position clone of an element. The clone keeps its original
 * classes so CSS rules still apply. Inherited properties, custom properties,
 * and pseudo-elements are copied for the entire subtree.
 */
export const cloneElement = (
  target: HTMLElement,
  zIndex: number
): { clone: HTMLElement; rect: DOMRect } => {
  const rect = roundRect(target.getBoundingClientRect());
  const clone = target.cloneNode(true) as HTMLElement;

  copyCanvasContent(target, clone);
  copyStylesDeep(target, clone);

  // Keep descendants hidden by the editor invisible in the clone.
  // Remove DEVTOOL_HIDDEN_ATTR so DOM queries only find real originals.
  for (const hidden of clone.querySelectorAll<HTMLElement>(`[${DEVTOOL_HIDDEN_ATTR}]`)) {
    hidden.style.visibility = 'hidden';
    hidden.style.pointerEvents = 'none';
    hidden.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    hidden.dataset.cloneHidden = '';
  }

  setImportant(clone, 'position', 'fixed');
  setImportant(clone, 'left', `${rect.left}px`);
  setImportant(clone, 'top', `${rect.top}px`);
  setImportant(clone, 'width', `${rect.width}px`);
  setImportant(clone, 'height', `${rect.height}px`);
  setImportant(clone, 'margin', '0');
  clone.style.zIndex = String(zIndex);
  clone.style.pointerEvents = 'none';
  setImportant(clone, 'transform', 'none');
  setImportant(clone, 'transition', 'none');
  clone.style.visibility = 'visible';
  clone.setAttribute(DEVTOOL_MANAGED_ATTR, '');

  return { clone, rect };
};

const MAX_DEPTH = 50;

/**
 * Fix visibility/pointerEvents that may have been baked into the clone tree
 * by copyInheritedStylesDeep when the source element was hidden.
 */
const fixCloneVisibility = (el: HTMLElement, depth = 0): void => {
  if (depth > MAX_DEPTH) return;
  if ('cloneHidden' in el.dataset) return;
  if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
  if (el.style.pointerEvents === 'none') el.style.pointerEvents = '';
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child instanceof HTMLElement) fixCloneVisibility(child, depth + 1);
  }
};

/**
 * Clone an element in a "clean" visual state — temporarily restoring any
 * styles modified by the editing system so cloneElement reads correct
 * computed styles and bounding rects.
 */
export const cloneClean = (
  target: HTMLElement,
  zIndex: number
): { clone: HTMLElement; rect: DOMRect } => {
  const saved = {
    transform: target.style.transform,
    transformPriority: target.style.getPropertyPriority('transform'),
    display: target.style.display,
    displayPriority: target.style.getPropertyPriority('display'),
    visibility: target.style.visibility,
    visibilityPriority: target.style.getPropertyPriority('visibility'),
    pointerEvents: target.style.pointerEvents,
    pointerEventsPriority: target.style.getPropertyPriority('pointer-events'),
  };

  target.style.transform = 'none';
  if (saved.display === 'none') target.style.display = '';
  if (saved.visibility === 'hidden') target.style.visibility = 'visible';
  if (saved.pointerEvents === 'none') target.style.pointerEvents = '';

  const result = cloneElement(target, zIndex);

  target.style.setProperty('transform', saved.transform, saved.transformPriority);
  target.style.setProperty('display', saved.display, saved.displayPriority);
  target.style.setProperty('visibility', saved.visibility, saved.visibilityPriority);
  target.style.setProperty('pointer-events', saved.pointerEvents, saved.pointerEventsPriority);

  fixCloneVisibility(result.clone);

  return result;
};
