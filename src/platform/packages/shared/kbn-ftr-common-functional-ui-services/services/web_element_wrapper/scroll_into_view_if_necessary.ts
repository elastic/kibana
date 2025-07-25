/* eslint-disable @kbn/eslint/require-license-header */

/* @notice
 * Based on the scroll-into-view-if-necessary module from npm
 * https://github.com/stipsan/compute-scroll-into-view/blob/master/src/index.ts#L269-L340
 *
 * MIT License
 *
 * Copyright (c) 2018 Cody Olsen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export function scrollIntoViewIfNecessary(
  target: HTMLElement,
  fixedHeaderHeight: number = 0,
  fixedFooterHeight: number = 0
) {
  // Pick the element that actually scrolls:
  // 1. A custom scroller with id="scrollId"
  // 2. `document.scrollingElement`
  // 3. `document.documentElement` (legacy fallback)
  const rootScroller: HTMLElement | Element | null =
    document.getElementById('app-main-scroll') ||
    document.scrollingElement ||
    document.documentElement;

  if (!rootScroller) {
    throw new Error('No scroll container found');
  }

  // Current viewport size
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;

  const rootRect = rootScroller.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  // Is the target fully visible inside the chosen scroller?
  const isFullyVisible = () =>
    targetRect.top >= rootRect.top + fixedHeaderHeight &&
    targetRect.bottom <= rootRect.bottom - fixedFooterHeight &&
    targetRect.left >= rootRect.left &&
    targetRect.right <= rootRect.right &&
    targetRect.top >= 0 &&
    targetRect.left >= 0 &&
    targetRect.bottom <= viewportHeight &&
    targetRect.right <= viewportWidth;

  // First, let the browser do a minimal scroll if needed
  if (!isFullyVisible()) {
    target.scrollIntoView();
  }

  // Re‑measure after the initial scroll
  const freshRect = target.getBoundingClientRect();

  // Pull the element down if the header still covers it
  const overlapWithHeader = fixedHeaderHeight - freshRect.top;
  if (overlapWithHeader > 0) {
    rootScroller.scrollTop -= overlapWithHeader;
  }

  // Push the element up if the footer still covers it
  if (fixedFooterHeight) {
    const bottomOfViewport = viewportHeight - fixedFooterHeight;
    const overlapWithFooter = freshRect.bottom - bottomOfViewport;
    if (overlapWithFooter > 0) {
      rootScroller.scrollTop += overlapWithFooter;
    }
  }
}
