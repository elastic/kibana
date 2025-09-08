/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';

export interface VisualStabilityOptions {
  /**
   * The minimum amount of time in milliseconds that the page must be stable before returning.
   */
  quietMs?: number;
  /**
   * The maximum amount of time in milliseconds that the function will wait before returning.
   */
  timeoutMs?: number;
  /**
   * The number of top-N largest visible elements to track.
   */
  trackTopN?: number;
  /**
   * The number of `requestAnimationFrame` samples to take.
   */
  rafSamples?: number;
}

type BoundingBox = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;

/**
 * Wait until the page is visually stable: no running CSS animations/transitions,
 * no layout shifts recently, and the top-N largest visible elements' bounding boxes
 * remain unchanged across a few rAF samples.
 */
export async function waitForVisualStability(page: Page, opts?: VisualStabilityOptions) {
  const { quietMs = 300, timeoutMs = 3000, trackTopN = 20, rafSamples = 3 } = opts || {};

  await page.evaluate(
    async ([quiet, timeout, topN, samples]) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Type guard to check if a PerformanceEntry has the 'hadRecentInput' property
      const isLayoutShift = (
        entry: PerformanceEntry
      ): entry is PerformanceEntry & { hadRecentInput: boolean } => {
        return entry.entryType === 'layout-shift' && 'hadRecentInput' in entry;
      };

      // Any running animations or transitions?
      //
      // While Playwright supports disabling animations and transitions, I've found that
      // it's not always reliable with EUI code, or code that watches for `onAnimationFrame`
      // and other events.
      //
      // Checking for animations/transitions is a pretty cheap way to ensure that the page is
      // stable before taking a screenshot.  Still, it's a WIP.
      const animationsRunning = () => {
        try {
          // Web Animations API, includes CSS animations/transitions
          const anims = (document as any).getAnimations?.({ subtree: true }) || [];
          for (const a of anims) {
            if (a.playState === 'running' || a.playState === 'pending') return true;
          }
        } catch {
          // ignore failures at start capture
        }
        return false;
      };

      // Select top-N largest visible elements to monitor
      const topVisibleElements = (n: number): Element[] => {
        const els = Array.from(document.body.querySelectorAll<HTMLElement>('*'));
        const within = (r: DOMRect) =>
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth;
        const scored = els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el, r, area: within(r) ? r.width * r.height : 0 };
          })
          .filter((x) => x.area > 0)
          .sort((a, b) => b.area - a.area)
          .slice(0, n);
        return scored.map((s) => s.el);
      };

      const boxesStable = async (elements: Element[], sampleCount: number): Promise<boolean> => {
        const frames: Array<Map<Element, BoundingBox>> = [];

        // Take a few samples of the page's bounding boxes.
        for (let i = 0; i < sampleCount; i++) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));

          const frame = new Map<Element, BoundingBox>();

          for (const element of elements) {
            const { x, y, width, height } = element.getBoundingClientRect();

            frame.set(element, {
              x: Math.floor(x),
              y: Math.floor(y),
              width: Math.floor(width),
              height: Math.floor(height),
            });
          }

          frames.push(frame);
        }

        // Compare each frame to the first frame.  If any element's bounding box has changed, then the page is not stable.
        for (let i = 1; i < frames.length; i++) {
          for (const element of frames[0].keys()) {
            const previousFrame = frames[i - 1].get(element)!;
            const currentFrame = frames[i].get(element)!;

            // If the bounding box of any element has changed, then the page is not stable.
            if (
              previousFrame.x !== currentFrame.x ||
              previousFrame.y !== currentFrame.y ||
              previousFrame.width !== currentFrame.width ||
              previousFrame.height !== currentFrame.height
            ) {
              return false;
            }
          }
        }

        return true;
      };

      const start = performance.now();
      let lastChange = performance.now();

      // Track layout shifts (Layout Instability API)
      let lastShift = performance.now();
      let perfObserver: PerformanceObserver | undefined;

      const watchEls = topVisibleElements(topN);

      try {
        perfObserver = new PerformanceObserver((list) => {
          for (const perfEntry of list.getEntries()) {
            // 'hadRecentInput' is only present on LayoutShift entries
            // Use a type guard to check for its presence
            if (isLayoutShift(perfEntry)) {
              lastShift = performance.now();
            }
          }
        });

        perfObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Silently ignore layout shift observation failures
      }

      while (performance.now() - start < timeout) {
        const areAnimationsRunning = animationsRunning();
        const areBoxesStable = await boxesStable(watchEls, samples);

        // If the page is stable, and there are no animations running, and there have been no layout shifts recently,
        // let's check again in 100ms to break out of the loop.
        if (!areAnimationsRunning && areBoxesStable && performance.now() - lastShift >= quiet) {
          await sleep(100);
          const areAnimationsStillRunning = animationsRunning();
          const areBoxesStableNow = await boxesStable(watchEls, samples);

          // If the page is still stable, and there are no animations running, and there have been no layout shifts recently,
          // let's break out of the loop.
          if (
            !areAnimationsStillRunning &&
            areBoxesStableNow &&
            performance.now() - lastShift >= quiet
          ) {
            break;
          }

          lastChange = performance.now();
        } else {
          lastChange = performance.now();
        }

        if (performance.now() - lastChange < quiet) {
          await sleep(50);
        }
      }

      try {
        perfObserver?.disconnect();
      } catch {
        // ignore failures at end capture
      }
    },
    [quietMs, timeoutMs, trackTopN, rafSamples]
  );
}
