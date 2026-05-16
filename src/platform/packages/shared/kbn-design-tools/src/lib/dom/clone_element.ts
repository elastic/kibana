/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_MANAGED_ATTR,
  TRUNCATION_CLASSES,
  INHERITED_CSS_PROPS,
  BACKGROUND_CSS_PROPS,
  CSS_VAR_PREFIX,
  MAX_TREE_DEPTH,
} from '../constants';
import { tagColorTokens, colorToToken, toHex } from './color_token_lookup';
import { getTokenVar } from './color_token_stylesheet';

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

export const softHideElement = (el: HTMLElement, savedTransform?: string): void => {
  el.setAttribute(DEVTOOL_HIDDEN_ATTR, savedTransform ?? (el.style.transform || ''));
  setImportant(el, 'visibility', 'hidden');
  setImportant(el, 'pointer-events', 'none');
};

export const restoreHiddenElement = (el: HTMLElement): void => {
  el.style.transform = el.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '';
  el.style.removeProperty('visibility');
  el.style.removeProperty('pointer-events');
  el.removeAttribute(DEVTOOL_HIDDEN_ATTR);
};

const MEDIA_TAGS = new Set(['IMG', 'SVG', 'VIDEO', 'PICTURE', 'CANVAS', 'OBJECT', 'EMBED']);

/**
 * Remove frozen inline dimensions from all descendants after a parent
 * dimension change, so children reflow naturally. Media elements (img, svg,
 * video, etc.) get max-width/max-height constraints to scale proportionally.
 */
export const unfreezeChildren = (
  parent: HTMLElement,
  property: 'width' | 'height',
  depth = 0
): void => {
  if (depth > MAX_TREE_DEPTH) return;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child instanceof HTMLElement) {
      child.style.removeProperty(property);
      if (MEDIA_TAGS.has(child.tagName)) {
        const otherProp = property === 'width' ? 'height' : 'width';
        child.style.removeProperty(otherProp);
        setImportant(child, 'max-width', '100%');
        setImportant(child, 'max-height', '100%');
        if (child.tagName === 'IMG' || child.tagName === 'VIDEO') {
          setImportant(child, 'height', 'auto');
          setImportant(child, 'width', 'auto');
        }
      }
      unfreezeChildren(child, property, depth + 1);
    }
  }
};

/**
 * Walk from `el` up to (but not including) `root`, removing frozen inline
 * dimensions and max-* constraints so each ancestor can grow to fit its
 * content. Stops at `root` to avoid unfreezing the clone root itself
 * (whose dimensions are managed separately).
 *
 * NOTE: sizing mode — this always unfreezes, implementing implicit "hug"
 * behaviour. To add a "fixed" mode, check a per-element flag here and
 * stop walking when an ancestor is marked as fixed-size.
 */
const unfreezeAncestors = (
  el: HTMLElement,
  property: 'width' | 'height',
  root?: HTMLElement | null
): void => {
  const maxProp = property === 'width' ? 'max-width' : 'max-height';
  let ancestor = el.parentElement;
  while (ancestor && ancestor !== root?.parentElement) {
    ancestor.style.removeProperty(property);
    ancestor.style.removeProperty(maxProp);
    ancestor = ancestor.parentElement;
  }
};

/**
 * Unfreeze children after a style property change so they reflow naturally.
 * For width/height, only the changed dimension is unfrozen.
 * For padding/margin, both dimensions are unfrozen since the content area changes.
 *
 * When `root` is provided, ancestors between `el` and `root` are also
 * unfrozen so the parent chain can grow to accommodate the new size.
 * This gives "hug contents" behaviour by default: parents resize to fit
 * their children.
 *
 * NOTE: sizing mode — currently all elements use implicit "hug" behaviour
 * (ancestors unfreeze). To support explicit sizing modes (fixed / hug /
 * fill) in the future, gate the ancestor walk on a per-element mode flag
 * and skip unfreezing for ancestors marked as "fixed".
 */
export const reflowAfterStyleChange = (
  el: HTMLElement,
  cssProp: string,
  root?: HTMLElement | null
): void => {
  if (cssProp === 'width' || cssProp === 'height') {
    unfreezeChildren(el, cssProp);
    unfreezeAncestors(el, cssProp, root);
  } else if (cssProp === 'padding' || cssProp === 'margin') {
    unfreezeChildren(el, 'width');
    unfreezeChildren(el, 'height');
    unfreezeAncestors(el, 'width', root);
    unfreezeAncestors(el, 'height', root);
  }
};

/**
 * Unfreeze a text node's parent and its descendants after a text content,
 * font-size, or font-weight change so the parent resizes to fit.
 */
export const reflowAfterTextChange = (parent: HTMLElement): void => {
  parent.style.removeProperty('width');
  parent.style.removeProperty('height');
  unfreezeChildren(parent, 'width');
  unfreezeChildren(parent, 'height');
};

/**
 * Reflow a managed element after a style property has been applied.
 *
 * Call this after setting any inline style on a managed element so that
 * frozen ancestor/child dimensions are unfrozen as needed. This is the
 * single entry point for post-edit reflow — used by both live editing
 * (`applyEditChanges`) and session import (`importState`).
 */
export const reflowManagedStyle = (element: HTMLElement, cssProp: string): void => {
  if (element.closest(`[${DEVTOOL_MANAGED_ATTR}]`)) {
    reflowAfterStyleChange(element, cssProp);
  }
};

/**
 * Reflow a managed element after a text content, font-size, or font-weight
 * change. Counterpart of `reflowManagedStyle` for text edits.
 */
export const reflowManagedText = (parent: HTMLElement | null): void => {
  if (parent?.closest(`[${DEVTOOL_MANAGED_ATTR}]`)) {
    reflowAfterTextChange(parent);
  }
};

/**
 * A frozen inline dimension captured before reflow removes it.
 * Used to restore dimensions on undo/revert.
 */
export interface DimensionRecord {
  readonly element: HTMLElement;
  readonly property: string;
  readonly value: string;
  readonly priority: string;
}

const recordDim = (el: HTMLElement, prop: string, out: DimensionRecord[]): void => {
  const value = el.style.getPropertyValue(prop);
  if (value) {
    out.push({ element: el, property: prop, value, priority: el.style.getPropertyPriority(prop) });
  }
};

const collectChildDims = (
  parent: HTMLElement,
  property: 'width' | 'height',
  out: DimensionRecord[],
  depth = 0
): void => {
  if (depth > MAX_TREE_DEPTH) return;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child instanceof HTMLElement) {
      recordDim(child, property, out);
      if (MEDIA_TAGS.has(child.tagName)) {
        const otherProp = property === 'width' ? 'height' : 'width';
        recordDim(child, otherProp, out);
        recordDim(child, 'max-width', out);
        recordDim(child, 'max-height', out);
      }
      collectChildDims(child, property, out, depth + 1);
    }
  }
};

const collectAncestorDims = (
  el: HTMLElement,
  property: 'width' | 'height',
  root: HTMLElement | null | undefined,
  out: DimensionRecord[]
): void => {
  const maxProp = property === 'width' ? 'max-width' : 'max-height';
  let ancestor = el.parentElement;
  while (ancestor && ancestor !== root?.parentElement) {
    recordDim(ancestor, property, out);
    recordDim(ancestor, maxProp, out);
    ancestor = ancestor.parentElement;
  }
};

/**
 * Collect the frozen inline dimensions that {@link reflowAfterTextChange}
 * will remove. Call BEFORE reflow to capture state for undo/revert.
 */
export const collectTextReflowDimensions = (parent: HTMLElement): DimensionRecord[] => {
  const out: DimensionRecord[] = [];
  recordDim(parent, 'width', out);
  recordDim(parent, 'height', out);
  collectChildDims(parent, 'width', out);
  collectChildDims(parent, 'height', out);
  return out;
};

/**
 * Collect the frozen inline dimensions that {@link reflowAfterStyleChange}
 * will remove. Call BEFORE reflow to capture state for undo/revert.
 */
export const collectStyleReflowDimensions = (
  el: HTMLElement,
  cssProp: string,
  root?: HTMLElement | null
): DimensionRecord[] => {
  const out: DimensionRecord[] = [];
  if (cssProp === 'width' || cssProp === 'height') {
    collectChildDims(el, cssProp, out);
    collectAncestorDims(el, cssProp, root, out);
  } else if (cssProp === 'padding' || cssProp === 'margin') {
    collectChildDims(el, 'width', out);
    collectChildDims(el, 'height', out);
    collectAncestorDims(el, 'width', root, out);
    collectAncestorDims(el, 'height', root, out);
  }
  return out;
};

/**
 * Restore frozen dimensions that were previously collected before a reflow.
 */
export const restoreDimensions = (records: DimensionRecord[]): void => {
  for (const { element, property, value, priority } of records) {
    element.style.setProperty(property, value, priority);
  }
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
  };
};

const URL_ID_RE = /\burl\(#([^)]+)\)/g;
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Rewrite all IDs inside SVGs within `root` to unique values and update
 * every internal reference (`url(#id)`, `xlink:href="#id"`, `href="#id"`).
 * Prevents ID collisions when the original and its clone coexist in
 * the same document, which causes masks, clip-paths, and use-references
 * to resolve to the wrong (hidden original) element.
 */
export const deduplicateSvgIds = (root: HTMLElement): void => {
  const svgs = root.querySelectorAll('svg');
  for (const svg of svgs) {
    const idMap = new Map<string, string>();
    const suffix = uuidv4().slice(0, 8);

    for (const el of svg.querySelectorAll('[id]')) {
      const oldId = el.id;
      const newId = `${oldId}_${suffix}`;
      idMap.set(oldId, newId);
      el.setAttribute('id', newId);
    }

    if (idMap.size === 0) continue;

    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name === 'id') continue;
        let updated = attr.value;
        let changed = false;

        updated = updated.replace(URL_ID_RE, (_match, id) => {
          const newId = idMap.get(id);
          if (newId) {
            changed = true;
            return `url(#${newId})`;
          }
          return _match;
        });

        if (updated.startsWith('#') && idMap.has(updated.slice(1))) {
          updated = `#${idMap.get(updated.slice(1))}`;
          changed = true;
        }

        if (changed) {
          if (attr.namespaceURI === XLINK_NS) {
            el.setAttributeNS(XLINK_NS, attr.name, updated);
          } else {
            el.setAttribute(attr.name, updated);
          }
        }
      }
    }
  }
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

  // Copy backgrounds only when the element is not in an interactive
  // pseudo-class state, so we capture the resting appearance.
  // Always copy for replaced/media elements. They don't change
  // background on hover, and their background-color is often used as
  // a fill behind semi-transparent content (e.g. SVG icons).
  const isReplacedElement = /^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/.test(target.tagName);
  const shouldCopyBackground = isReplacedElement || !target.matches(':hover, :focus, :active');
  if (shouldCopyBackground) {
    for (const prop of BACKGROUND_CSS_PROPS) {
      clone.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }

  // Copy only custom properties that are explicitly set in the
  // element's own inline style. getComputedStyle would include every
  // inherited global var (--kbn-layout-*, --kbn-application-*, etc.)
  // which bloats the clone and can break layout. CSS-rule-based
  // custom properties cascade naturally via the preserved class names.
  // Skip --dt-* tokens; those are managed by the :root stylesheet.
  for (let i = 0; i < target.style.length; i++) {
    const prop = target.style[i];
    const isExternalCustomProperty = prop.startsWith('--') && !prop.startsWith(CSS_VAR_PREFIX);
    if (isExternalCustomProperty) {
      clone.style.setProperty(prop, target.style.getPropertyValue(prop));
    }
  }

  // Record which inline color values match EUI theme tokens so they
  // can be re-resolved when importing into a different color mode.
  tagColorTokens(target, clone);
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

  const hasNoPseudoContent = !content || content === 'none' || content === 'normal';
  if (hasNoPseudoContent) {
    return;
  }

  const isInteractive = original.matches(':hover, :focus, :active');

  const className = `__pseudo_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  clone.classList.add(className);

  const rules: string[] = [`content: ${content};`];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop === 'content') continue;
    // Custom properties inherit from the parent element; re-declaring
    // them on the pseudo-element creates self-referencing var() cycles
    // that resolve to empty strings in subsequent clones.
    if (prop.startsWith(CSS_VAR_PREFIX)) continue;
    // Skip background props for hovered elements. The CSS class on the
    // clone provides the correct resting-state appearance.
    if (isInteractive && BACKGROUND_CSS_PROPS.has(prop)) continue;
    const rawValue = computed.getPropertyValue(prop);
    const token = colorToToken(rawValue, prop);
    if (token) {
      const hex = toHex(rawValue);
      rules.push(`${prop}: ${getTokenVar(token, hex ?? undefined)};`);
    } else {
      rules.push(`${prop}: ${rawValue};`);
    }
  }

  const style = document.createElement('style');
  style.textContent = `.${className}${pseudo} { ${rules.join(' ')} }`;
  clone.appendChild(style);
};

/**
 * Check whether an element has direct text content (non-whitespace
 * Text nodes). Elements with text get blurry when rendered at subpixel
 * boundaries, so their dimensions should be rounded to whole pixels.
 * Pure layout containers (flex wrappers, spacers, images) keep exact
 * subpixel dimensions to preserve layout math.
 */
const hasDirectText = (el: HTMLElement): boolean => {
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      node.textContent.trim().length > 0
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Recursively copy inherited styles, pseudo-elements, and freeze layout
 * dimensions from the original tree to the clone tree in a single pass.
 */
export const copyStylesDeep = (
  original: HTMLElement,
  clone: HTMLElement,
  isRoot = true,
  depth = 0,
  counter?: { count: number }
): void => {
  if (depth > MAX_TREE_DEPTH) return;

  // Lazily initialize a shared counter for the entire tree walk.
  const ctx = counter ?? { count: 0 };
  ctx.count++;
  if (ctx.count > MAX_CLONE_ELEMENTS) {
    return;
  }

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

  const shouldPinDimensions = !isRoot && !hadTruncationClass;
  if (shouldPinDimensions) {
    const childRect = original.getBoundingClientRect();
    // Round dimensions for text-bearing elements to prevent subpixel
    // blur. Layout-only containers keep exact float values so flex/grid
    // sibling widths sum correctly and text doesn't reflow.
    const w = hasDirectText(original) ? Math.round(childRect.width) : childRect.width;
    const h = hasDirectText(original) ? Math.round(childRect.height) : childRect.height;
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    clone.style.boxSizing = 'border-box';
  }

  const origChildren = original.children;
  const cloneChildren = clone.children;

  for (let i = 0; i < origChildren.length; i++) {
    const origChild = origChildren[i];
    const cloneChild = cloneChildren[i];
    if (origChild instanceof HTMLElement && cloneChild instanceof HTMLElement) {
      copyStylesDeep(origChild, cloneChild, false, depth + 1, ctx);
    }
  }
};

const TRUNCATION_SELECTOR = TRUNCATION_CLASSES.map((c) => `.${c}`).join(',');

/**
 * Check whether the target or any descendant has a truncation class, and if
 * so temporarily append the clone to the body to measure its natural
 * `scrollWidth`. When the clone is wider than `rect`, update both the clone's
 * CSS width and the returned rect.
 */
export const widenForTruncation = (
  target: HTMLElement,
  clone: HTMLElement,
  rect: DOMRect
): DOMRect => {
  const hadTruncation =
    TRUNCATION_CLASSES.some((cls) => target.classList.contains(cls)) ||
    target.querySelector(TRUNCATION_SELECTOR) !== null;
  if (!hadTruncation) return rect;

  clone.style.visibility = 'hidden';
  document.body.appendChild(clone);
  const naturalWidth = clone.scrollWidth;
  document.body.removeChild(clone);
  clone.style.visibility = 'visible';
  if (naturalWidth > rect.width) {
    const w = Math.ceil(naturalWidth);
    setImportant(clone, 'width', `${w}px`);
    return new DOMRect(rect.x, rect.y, w, rect.height);
  }
  return rect;
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
  let rect = roundRect(target.getBoundingClientRect());

  const clone = target.cloneNode(true) as HTMLElement;

  copyCanvasContent(target, clone);
  copyStylesDeep(target, clone);
  deduplicateSvgIds(clone);

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

  // copyStylesDeep strips truncation classes (eui-textTruncate etc.) from
  // the clone and all descendants, so text that was clipped may now be wider.
  rect = widenForTruncation(target, clone, rect);

  return { clone, rect };
};

/**
 * Maximum number of elements to process in copyStylesDeep before bailing out.
 * Prevents freezing the main thread when cloning large component trees
 * (e.g. data tables with hundreds of rows). Elements beyond this limit
 * will retain their CSS class styling but won't have computed styles inlined.
 */
const MAX_CLONE_ELEMENTS = 2000;

/**
 * Fix visibility/pointerEvents that may have been baked into the clone tree
 * by copyInheritedStylesDeep when the source element was hidden.
 */
const fixCloneVisibility = (el: HTMLElement, depth = 0): void => {
  if (depth > MAX_TREE_DEPTH) return;
  if ('cloneHidden' in el.dataset) return;
  if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
  if (el.style.pointerEvents === 'none') el.style.pointerEvents = '';
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child instanceof HTMLElement) fixCloneVisibility(child, depth + 1);
  }
};

/**
 * Build a mapping from every element in the `original` tree to its
 * positional counterpart in the `clone` tree. Both trees must share
 * the same DOM structure (as produced by `cloneNode(true)`).
 */
export const buildElementMap = (
  original: HTMLElement,
  clone: HTMLElement
): Map<Element, Element> => {
  const map = new Map<Element, Element>();
  map.set(original, clone);
  const originals = original.querySelectorAll('*');
  const clones = clone.querySelectorAll('*');
  for (let i = 0; i < originals.length && i < clones.length; i++) {
    map.set(originals[i], clones[i]);
  }
  return map;
};

/**
 * Build a mapping from every Text node in the `original` tree to its
 * positional counterpart in the `clone` tree.
 */
export const buildTextNodeMap = (original: HTMLElement, clone: HTMLElement): Map<Text, Text> => {
  const map = new Map<Text, Text>();
  const walker = (root: Node): Text[] => {
    const nodes: Text[] = [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = tw.nextNode())) {
      nodes.push(node as Text);
    }
    return nodes;
  };
  const origTexts = walker(original);
  const cloneTexts = walker(clone);
  for (let i = 0; i < origTexts.length && i < cloneTexts.length; i++) {
    map.set(origTexts[i], cloneTexts[i]);
  }
  return map;
};

/**
 * Clone an element in a "clean" visual state, temporarily restoring any
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

  try {
    const result = cloneElement(target, zIndex);
    fixCloneVisibility(result.clone);
    return result;
  } finally {
    // Always restore original styles, even if cloneElement throws.
    target.style.setProperty('transform', saved.transform, saved.transformPriority);
    target.style.setProperty('display', saved.display, saved.displayPriority);
    target.style.setProperty('visibility', saved.visibility, saved.visibilityPriority);
    target.style.setProperty('pointer-events', saved.pointerEvents, saved.pointerEventsPriority);
  }
};
