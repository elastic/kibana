/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_SELECTOR, getEffectiveBackgroundColor } from '@kbn/dev-comments';

/** Elements this far (in px) beyond the viewport are still rendered, so that shadows and edges are not cut short. */
const OFFSCREEN_MARGIN = 100;

/** Whether an element's box lies entirely outside the viewport; boxless ones (portal containers) are kept, their descendants may be on screen. */
const isOffScreen = (node: Node, viewportWidth: number, viewportHeight: number): boolean => {
  if (!(node instanceof Element)) {
    return false;
  }
  const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
  if (width === 0 && height === 0) {
    return false;
  }
  return (
    right < -OFFSCREEN_MARGIN ||
    bottom < -OFFSCREEN_MARGIN ||
    left > viewportWidth + OFFSCREEN_MARGIN ||
    top > viewportHeight + OFFSCREEN_MARGIN
  );
};

/** Marks the clone of a scrolled text field with its scroll offset, for `drawScrolledFields`. */
const FIELD_SCROLL_ATTR = 'data-dev-comments-field-scroll';

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'email', 'tel', 'number']);

/** Fields draw their value themselves; a clone shows it only once the library has put it in, see `drawScrolledFields`. */
const isTextField = (element: Element): element is HTMLTextAreaElement | HTMLInputElement =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type));

/**
 * Clones start unscrolled: once a scrolled container's content is in place, it
 * is shifted by the scroll offset (elements by a transform, the container's own
 * text in a positioned wrapper) and clipped. A text field, whose value is not
 * there yet, is marked for `drawScrolledFields`, with the styles a box lacks made explicit.
 */
export const preserveScroll = (original: Node, clone: Node, after: boolean) => {
  if (!after || !(original instanceof Element) || !(clone instanceof HTMLElement)) {
    return;
  }
  const { scrollLeft, scrollTop } = original;
  if (scrollLeft === 0 && scrollTop === 0) {
    return;
  }
  if (isTextField(original)) {
    clone.setAttribute(FIELD_SCROLL_ATTR, `${scrollLeft},${scrollTop}`);
    const { display, whiteSpace, overflowWrap } = getComputedStyle(original);
    clone.style.display = display;
    clone.style.whiteSpace = whiteSpace;
    clone.style.overflowWrap = overflowWrap;
    return;
  }
  clone.style.overflowX = 'hidden';
  clone.style.overflowY = 'hidden';
  const shift = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
  for (const child of Array.from(clone.childNodes)) {
    if (child instanceof HTMLElement || child instanceof SVGElement) {
      const own = child.style.transform;
      child.style.transform = own && own !== 'none' ? `${shift} ${own}` : shift;
    } else if (child instanceof Text && child.data.trim() !== '') {
      const wrapper = document.createElement('span');
      wrapper.style.position = 'relative';
      wrapper.style.left = `${-scrollLeft}px`;
      wrapper.style.top = `${-scrollTop}px`;
      child.replaceWith(wrapper);
      wrapper.append(child);
    }
  }
};

/** Replaces each scrolled field's clone (marked by `preserveScroll`) with a box of the same styles, clipping its value shifted by the scroll offset. */
export const drawScrolledFields = (root: Element) => {
  for (const field of Array.from(root.querySelectorAll<HTMLElement>(`[${FIELD_SCROLL_ATTR}]`))) {
    const [scrollLeft, scrollTop] = (field.getAttribute(FIELD_SCROLL_ATTR) ?? '0,0')
      .split(',')
      .map(Number);
    const box = document.createElement('div');
    box.style.cssText = field.style.cssText;
    box.style.overflow = 'hidden';
    const value = document.createElement('div');
    value.textContent =
      field instanceof HTMLTextAreaElement ? field.textContent : field.getAttribute('value');
    value.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    box.append(value);
    field.replaceWith(box);
  }
};

/** What is on screen, at the viewport's size in CSS pixels, without the layer's own UI (marked with `IGNORE_ATTR`). */
export const captureViewport = async (): Promise<HTMLCanvasElement> => {
  const { default: domtoimage } = await import('dom-to-image-more');
  const { innerWidth: width, innerHeight: height, scrollX, scrollY } = window;
  return domtoimage.toCanvas(document.body, {
    width,
    height,
    // The scroll position, by margins: unlike a transform, they leave fixed chrome (header, flyouts) where it is.
    style: { marginTop: `${-scrollY}px`, marginLeft: `${-scrollX}px` },
    // `body` is transparent in Kibana (the color is on `html`).
    bgcolor: getEffectiveBackgroundColor(document.body),
    // A filtered node is left out with its whole subtree.
    filter: (node) =>
      !(node instanceof Element && node.matches(IGNORE_SELECTOR)) &&
      !isOffScreen(node, width, height),
    adjustClonedNode: preserveScroll,
    onclone: drawScrolledFields,
  });
};
