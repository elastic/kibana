/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR, TRUNCATION_CLASSES } from '../constants';

/**
 * Copy pixel data from all canvas elements in the original tree to their
 * corresponding clones. cloneNode does not preserve canvas content.
 */
const copyCanvasContent = (original: HTMLElement, clone: HTMLElement): void => {
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

// Inherited CSS properties that are lost when the clone is reparented to
// document.body, because they no longer cascade from the original ancestors.
const INHERITED_PROPS = [
  'color',
  'direction',
  'font',
  'font-family',
  'font-feature-settings',
  'font-kerning',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-variation-settings',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-indent',
  'text-transform',
  'visibility',
  'white-space',
  'white-space-collapse',
  'word-break',
  'word-spacing',
  'writing-mode',
  '-webkit-font-smoothing',
  '-webkit-text-fill-color',
  '-webkit-text-stroke',
  'text-rendering',
];

// Non-inherited visual properties that can be lost when the clone leaves
// the original style scope (e.g. contextual selectors or CSS variable
// chains that no longer resolve).
const NON_INHERITED_VISUAL_PROPS = ['border-radius'];

// Background properties are copied only for non-hovered elements.
// For hovered elements the CSS classes on the clone already provide the
// correct resting-state background; baking the computed (hovered) value
// as an inline style would override it.
const BACKGROUND_PROPS = new Set([
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-attachment',
  'background-clip',
  'background-origin',
  'background-blend-mode',
]);

/**
 * Copy inherited CSS properties, non-inherited visual properties, and CSS
 * custom properties from the original element's computed style to the clone.
 */
const copyInheritedStyles = (target: HTMLElement, clone: HTMLElement): void => {
  const computed = getComputedStyle(target);

  for (const prop of INHERITED_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  // Preserve non-inherited visual styles
  for (const prop of NON_INHERITED_VISUAL_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  // Copy backgrounds only when the element is not in an interactive
  // pseudo-class state, so we capture the resting appearance.
  if (!target.matches(':hover, :focus, :active')) {
    for (const prop of BACKGROUND_PROPS) {
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
    if (isInteractive && BACKGROUND_PROPS.has(prop)) continue;
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
export const copyStylesDeep = (original: HTMLElement, clone: HTMLElement, isRoot = true): void => {
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
    const rect = original.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.boxSizing = 'border-box';
  }

  const origChildren = original.children;
  const cloneChildren = clone.children;

  for (let i = 0; i < origChildren.length; i++) {
    const origChild = origChildren[i];
    const cloneChild = cloneChildren[i];
    if (origChild instanceof HTMLElement && cloneChild instanceof HTMLElement) {
      copyStylesDeep(origChild, cloneChild, false);
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
  const rect = target.getBoundingClientRect();
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
  clone.setAttribute(DEVTOOL_MANAGED_ATTR, '');

  return { clone, rect };
};

/**
 * Fix visibility/pointerEvents that may have been baked into the clone tree
 * by copyInheritedStylesDeep when the source element was hidden.
 */
const fixCloneVisibility = (el: HTMLElement): void => {
  if ('cloneHidden' in el.dataset) return;
  if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
  if (el.style.pointerEvents === 'none') el.style.pointerEvents = '';
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child instanceof HTMLElement) fixCloneVisibility(child);
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
    display: target.style.display,
    visibility: target.style.visibility,
    pointerEvents: target.style.pointerEvents,
  };

  target.style.transform = 'none';
  if (saved.display === 'none') target.style.display = '';
  if (saved.visibility === 'hidden') target.style.visibility = 'visible';
  if (saved.pointerEvents === 'none') target.style.pointerEvents = '';

  const result = cloneElement(target, zIndex);

  target.style.transform = saved.transform;
  target.style.display = saved.display;
  target.style.visibility = saved.visibility;
  target.style.pointerEvents = saved.pointerEvents;

  fixCloneVisibility(result.clone);

  return result;
};
