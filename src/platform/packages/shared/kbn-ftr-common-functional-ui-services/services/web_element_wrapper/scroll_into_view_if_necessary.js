/* eslint-disable @kbn/eslint/require-license-header, no-var */

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

export function scrollIntoViewIfNecessary(target, fixedHeaderHeight, fixedFooterHeight) {
  var scrollContainerId = 'app-main-scroll';
  var rootScroller = document.scrollingElement || document.documentElement;
  var isContainerScroll = false;

  // Check if a specific container is provided for scrolling
  if (scrollContainerId && document.getElementById(scrollContainerId)) {
    var containerElement = document.getElementById(scrollContainerId);

    // Check if target is inside the container using the contains method
    var isTargetInContainer = containerElement.contains(target);

    // Only use container scrolling if target is inside the container
    if (isTargetInContainer) {
      rootScroller = containerElement;
      isContainerScroll = true;
    }
  }

  var rootRect = rootScroller.getBoundingClientRect();
  var targetRect = target.getBoundingClientRect();

  var viewportHeight = window.visualViewport ? visualViewport.height : window.innerHeight;
  var viewportWidth = window.visualViewport ? visualViewport.width : window.innerWidth;

  // If using a container, adjust viewport dimensions to container dimensions
  if (isContainerScroll) {
    viewportHeight = rootRect.height;
    viewportWidth = rootRect.width;
  }

  function isInView() {
    if (isContainerScroll) {
      // For container scrolling, check if the element is within the container's bounds
      return (
        targetRect.top >= rootRect.top &&
        targetRect.left >= rootRect.left &&
        targetRect.bottom <= rootRect.bottom &&
        targetRect.right <= rootRect.right
      );
    } else {
      // For document scrolling, check if element is in viewport
      return (
        targetRect.top >= 0 &&
        targetRect.left >= 0 &&
        targetRect.bottom <= viewportHeight &&
        targetRect.right <= viewportWidth
      );
    }
  }

  if (!isInView()) {
    target.scrollIntoView();
  }

  targetRect = target.getBoundingClientRect();

  // Calculate the additional scroll needed based on whether we're in container or document scrolling
  var additionalScrollNecessary;
  if (isContainerScroll) {
    // For container scrolling, we need to calculate the offset relative to the container's top
    additionalScrollNecessary = fixedHeaderHeight - (targetRect.top - rootRect.top);
  } else {
    // For document scrolling, use the original calculation
    additionalScrollNecessary = fixedHeaderHeight - targetRect.top;
  }

  if (additionalScrollNecessary > 0) {
    rootScroller.scrollTop = rootScroller.scrollTop - additionalScrollNecessary;
  }

  if (fixedFooterHeight) {
    var bottomOfVisibility = isContainerScroll
      ? rootRect.height - fixedFooterHeight
      : viewportHeight - fixedFooterHeight;

    var elementBottom = isContainerScroll ? targetRect.bottom - rootRect.top : targetRect.bottom;

    if (bottomOfVisibility < elementBottom) {
      rootScroller.scrollTop = rootScroller.scrollTop + (elementBottom - bottomOfVisibility);
    }
  }
}
