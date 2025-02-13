/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounceTime, fromEvent, map, merge, of, shareReplay } from 'rxjs';
import type { AnalyticsClient, RootSchema } from '@elastic/ebt/client';

export interface ViewportSize {
  viewport_width: number;
  viewport_height: number;
}

const schema: RootSchema<ViewportSize> = {
  viewport_width: {
    type: 'long',
    _meta: { description: 'The value seen as the CSS viewport @media (width)' },
  },
  viewport_height: {
    type: 'long',
    _meta: { description: 'The value seen as the CSS viewport @media (height)' },
  },
};

/**
 * Get the @media (width) and @media (height) in the format of {@link ViewportSize}
 */
function getViewportSize(): ViewportSize {
  // Explanation of the math below: https://stackoverflow.com/questions/1248081/how-to-get-the-browser-viewport-dimensions
  return {
    viewport_width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    viewport_height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
  };
}

/**
 * Registers the event type "viewport_size" in the analytics client, and the context provider with the same name.
 * Then it listens to all the "resize" events in the UI and reports their size as {@link ViewportSize}
 * @param analytics
 */
export function trackViewportSize(analytics: AnalyticsClient) {
  // window or document?
  // According to MDN, it only emits on `window`: https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
  const resize$ = fromEvent(window, 'resize').pipe(
    debounceTime(200),
    map(() => getViewportSize()),
    shareReplay(1)
  );

  analytics.registerEventType<ViewportSize>({
    eventType: 'viewport_resize',
    schema,
  });

  analytics.registerContextProvider({
    name: 'viewport_size',
    schema,
    context$: merge(
      of(getViewportSize()), // Emits an initial value so initial events' context is also populated
      resize$
    ),
  });

  return resize$.subscribe((event) => analytics.reportEvent('viewport_resize', event));
}
