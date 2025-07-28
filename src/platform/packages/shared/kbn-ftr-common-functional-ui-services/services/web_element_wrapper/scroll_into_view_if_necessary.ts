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
  scrollFixedHeader: number = 0,
  scrollFixedFooter: number = 0
) {
  // Get bounding rectangles
  const scroller =
    document.getElementById('app-main-scroll') ||
    document.scrollingElement ||
    document.documentElement;

  // Check if the target is in the scroller
  if (!scroller.contains(target)) return;

  // Measure helper, logic is different for scrolling the viewport vs a scroller element
  const getRects = () => {
    const targetRect = target.getBoundingClientRect();
    const scrollIsViewport = scroller === document.documentElement || scroller === document.body;
    const scrollReact = scrollIsViewport
      ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();
    return { targetRect, scrollReact };
  };

  const isVisible = ({ targetRect, scrollReact }: ReturnType<typeof getRects>) =>
    targetRect.top >= scrollReact.top + scrollFixedHeader &&
    targetRect.bottom <= scrollReact.bottom - scrollFixedFooter;

  let { targetRect, scrollReact } = getRects();

  if (isVisible({ targetRect, scrollReact })) return;

  // First try native scrollIntoView on the correct container
  target.scrollIntoView();

  if (scrollFixedHeader) {
    // remeasure
    ({ targetRect, scrollReact } = getRects());

    // Now adjust for fixed headers
    const deltaTop = targetRect.top - (scrollReact.top + scrollFixedHeader);
    if (deltaTop < 0) {
      scroller.scrollBy({ top: deltaTop });
    }
  }

  if (scrollFixedFooter) {
    // remeasure again
    ({ targetRect, scrollReact } = getRects());

    // Adjust for fixed footers
    const deltaBottom = targetRect.bottom - (scrollReact.bottom - scrollFixedFooter);
    if (deltaBottom > 0) {
      scroller.scrollBy({ top: deltaBottom });
    }
  }
}
