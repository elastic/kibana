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

// CSS properties that are inherited by default and may be lost when the clone
// is moved to document.body (away from its original parent context).
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

// Non-inherited visual properties that can be lost when the clone is moved
// outside the original Emotion/EUI style scope (e.g. contextual selectors
// or CSS variable chains that no longer resolve).
const NON_INHERITED_VISUAL_PROPS = [
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'border-radius',
];

/**
 * Copy inherited CSS properties, non-inherited visual properties, and CSS
 * custom properties from the original element's computed style to the clone.
 */
const copyInheritedStyles = (target: HTMLElement, clone: HTMLElement): void => {
  const computed = getComputedStyle(target);

  for (const prop of INHERITED_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  // Preserve Emotion/EUI visual styles that are not inherited
  for (const prop of NON_INHERITED_VISUAL_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop.startsWith('--')) {
      clone.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }
};

// EUI truncation utility classes that use !important and must be stripped from clones.
const TRUNCATION_CLASSES = ['eui-textTruncate', 'eui-textBreakWord', 'eui-textBreakAll'];

/**
 * Recursively walk both original and clone element trees, copying inherited
 * and custom properties at every node. This ensures descendants that relied
 * on values inherited from ancestors outside the cloned subtree render
 * correctly once the clone is moved to document.body.
 *
 * Also freezes layout dimensions on descendants using getBoundingClientRect()
 * (the actual rendered size) and strips EUI truncation classes so that
 * !important rules (e.g. eui-textTruncate with overflow:hidden !important +
 * text-overflow:ellipsis !important) cannot clip content that was visible
 * in the original flex/grid context.
 */
const copyInheritedStylesDeep = (
  original: HTMLElement,
  clone: HTMLElement,
  isRoot = true
): void => {
  copyInheritedStyles(original, clone);

  // Strip EUI truncation classes — they use !important which beats inline style overrides.
  let hadTruncationClass = false;
  for (const cls of TRUNCATION_CLASSES) {
    if (clone.classList.contains(cls)) {
      clone.classList.remove(cls);
      hadTruncationClass = true;
    }
  }

  // Freeze layout dimensions on descendants (not the root — that's handled by cloneElement).
  // getBoundingClientRect gives the true rendered size including flex/grid distribution.
  // Skip elements that had truncation classes: their original measured width reflects the
  // constrained/truncated size, but the clone (with the class stripped) should size naturally.
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
      copyInheritedStylesDeep(origChild, cloneChild, false);
    }
  }
};

let pseudoCounter = 0;

/**
 * If a pseudo-element (::before or ::after) has computed content, inject an
 * inline <style> rule that replicates its visual appearance on the clone.
 * This is necessary because pseudo-elements aren't part of the DOM and
 * cloneNode does not copy them.
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

  const className = `__pseudo_${pseudoCounter++}`;
  clone.classList.add(className);

  const rules: string[] = [`content: ${content};`];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop !== 'content') {
      rules.push(`${prop}: ${computed.getPropertyValue(prop)};`);
    }
  }

  const style = document.createElement('style');
  style.textContent = `.${className}${pseudo} { ${rules.join(' ')} }`;
  clone.appendChild(style);
};

/**
 * Walk the original and clone trees, copying ::before and ::after
 * pseudo-element styles for every element.
 */
const copyPseudoElements = (original: HTMLElement, clone: HTMLElement): void => {
  applyPseudoStyle(original, clone, '::before');
  applyPseudoStyle(original, clone, '::after');

  const origChildren = original.children;
  const cloneChildren = clone.children;

  for (let i = 0; i < origChildren.length; i++) {
    const origChild = origChildren[i];
    const cloneChild = cloneChildren[i];
    if (origChild instanceof HTMLElement && cloneChild instanceof HTMLElement) {
      copyPseudoElements(origChild, cloneChild);
    }
  }
};

/**
 * Create a fixed-position clone of an element. The clone keeps its original
 * classes so Emotion/CSS rules apply naturally. Inherited CSS properties,
 * custom properties, and pseudo-elements are copied for the entire subtree.
 */
export const cloneElement = (
  target: HTMLElement,
  zIndex: number
): { clone: HTMLElement; rect: DOMRect } => {
  const rect = target.getBoundingClientRect();
  const clone = target.cloneNode(true) as HTMLElement;

  // cloneNode doesn't copy canvas pixel data — copy it manually
  copyCanvasContent(target, clone);

  // Copy inherited and custom properties for the entire subtree
  copyInheritedStylesDeep(target, clone);

  // Copy pseudo-element styles (::before / ::after) for the entire subtree
  copyPseudoElements(target, clone);

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
