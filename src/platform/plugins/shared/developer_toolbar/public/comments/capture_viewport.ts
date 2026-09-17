/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_ATTR, getEffectiveBackgroundColor } from '@kbn/dev-comments';

/** Elements this far (in px) beyond the viewport are still rendered, so that shadows and edges are not cut short. */
const OFFSCREEN_MARGIN = 100;

/**
 * Whether a node can be left out of the capture: an element whose box lies
 * entirely outside the viewport. Boxless elements (portal containers,
 * `display: contents`) are kept, their descendants may well be on screen.
 * Skipping the rest is what keeps long pages affordable to capture.
 */
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

/**
 * Clones start unscrolled. Once the children of a scrolled container are in
 * place, they are shifted by its scroll offset and the container clips them,
 * as on screen. Inline styles set here survive the copy of computed styles.
 */
const preserveScroll = (original: Node, clone: Node, after: boolean) => {
  if (!after || !(original instanceof Element) || !(clone instanceof HTMLElement)) {
    return;
  }
  const { scrollLeft, scrollTop } = original;
  if (scrollLeft === 0 && scrollTop === 0) {
    return;
  }
  clone.style.overflowX = 'hidden';
  clone.style.overflowY = 'hidden';
  const shift = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
  for (const child of Array.from(clone.children)) {
    if (child instanceof HTMLElement || child instanceof SVGElement) {
      const own = child.style.transform;
      child.style.transform = own && own !== 'none' ? `${shift} ${own}` : shift;
    }
  }
};

/** What is on screen right now, at the viewport's size in CSS pixels, without the toolbar's or the layer's own UI. */
export const captureViewport = async (): Promise<HTMLCanvasElement> => {
  const { default: domtoimage } = await import('dom-to-image-more');
  const { innerWidth: width, innerHeight: height, scrollX, scrollY } = window;
  return domtoimage.toCanvas(document.body, {
    width,
    height,
    // The page's scroll position is reproduced by shifting the body's content
    // with margins: unlike a transform, they leave `position: fixed` chrome
    // (header, flyouts, modals) where it is on screen.
    style: { marginTop: `${-scrollY}px`, marginLeft: `${-scrollX}px` },
    // `body` is transparent in Kibana (the color is on `html`), so captures keep the app's color mode.
    bgcolor: getEffectiveBackgroundColor(document.body),
    filter: (node) =>
      !(node instanceof Element && node.hasAttribute(IGNORE_ATTR)) &&
      !isOffScreen(node, width, height),
    adjustClonedNode: preserveScroll,
  });
};
