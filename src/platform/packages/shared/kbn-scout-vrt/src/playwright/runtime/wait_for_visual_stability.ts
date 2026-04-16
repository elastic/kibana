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
  /** Minimum time in ms that the page must be stable before returning. */
  quietMs?: number;
  /** Maximum time in ms to wait before giving up and returning. */
  timeoutMs?: number;
  /** Number of top-N largest visible elements to track for layout stability. */
  trackTopN?: number;
  /** Number of requestAnimationFrame samples to compare for bounding box stability. */
  rafSamples?: number;
}

type BoundingBox = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;

/**
 * Wait until the page is visually stable: no running CSS animations or transitions,
 * no recent layout shifts, and the top-N largest visible elements' bounding boxes
 * remain unchanged across consecutive requestAnimationFrame samples.
 *
 * Playwright's `animations: 'disabled'` screenshot option disables new CSS animations
 * but does not reliably catch EUI components that use `onAnimationFrame`, transition
 * events, or other dynamic layout patterns. This function provides a more thorough
 * stability check before capturing a screenshot.
 */
export const waitForVisualStability = async (
  page: Page,
  opts?: VisualStabilityOptions
): Promise<void> => {
  const { quietMs = 300, timeoutMs = 3000, trackTopN = 20, rafSamples = 3 } = opts ?? {};

  await page.evaluate(
    async ([quiet, timeout, topN, samples]) => {
      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      const isLayoutShift = (
        entry: PerformanceEntry
      ): entry is PerformanceEntry & { hadRecentInput: boolean } =>
        entry.entryType === 'layout-shift' && 'hadRecentInput' in entry;

      const animationsRunning = (): boolean => {
        try {
          const anims = (document as any).getAnimations?.({ subtree: true }) ?? [];

          for (const a of anims) {
            if (a.playState === 'running' || a.playState === 'pending') {
              return true;
            }
          }
        } catch {
          // ignore
        }

        return false;
      };

      const topVisibleElements = (n: number): Element[] => {
        const els = Array.from(document.body.querySelectorAll<HTMLElement>('*'));

        const within = (r: DOMRect) =>
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth;

        return els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el, area: within(r) ? r.width * r.height : 0 };
          })
          .filter((x) => x.area > 0)
          .sort((a, b) => b.area - a.area)
          .slice(0, n)
          .map((s) => s.el);
      };

      const boxesStable = async (elements: Element[], sampleCount: number): Promise<boolean> => {
        const frames: Array<Map<Element, BoundingBox>> = [];

        for (let i = 0; i < sampleCount; i++) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));

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

        for (let i = 1; i < frames.length; i++) {
          for (const element of frames[0].keys()) {
            const prev = frames[i - 1].get(element)!;
            const curr = frames[i].get(element)!;

            if (
              prev.x !== curr.x ||
              prev.y !== curr.y ||
              prev.width !== curr.width ||
              prev.height !== curr.height
            ) {
              return false;
            }
          }
        }

        return true;
      };

      const start = performance.now();
      let lastChange = performance.now();
      let lastShift = performance.now();
      let perfObserver: PerformanceObserver | undefined;

      const watchEls = topVisibleElements(topN);

      try {
        perfObserver = new PerformanceObserver((list) => {
          for (const perfEntry of list.getEntries()) {
            if (isLayoutShift(perfEntry)) {
              lastShift = performance.now();
            }
          }
        });

        perfObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // silently ignore if layout shift observation is unavailable
      }

      while (performance.now() - start < timeout) {
        const areAnimationsRunning = animationsRunning();
        const areBoxesStable = await boxesStable(watchEls, samples);

        if (!areAnimationsRunning && areBoxesStable && performance.now() - lastShift >= quiet) {
          await sleep(100);

          if (
            !animationsRunning() &&
            (await boxesStable(watchEls, samples)) &&
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
        // ignore
      }
    },
    [quietMs, timeoutMs, trackTopN, rafSamples]
  );
};
