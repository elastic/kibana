/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { once } from 'lodash';
import { Observable, ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * Check whether an element is visible and emit, only once, when it intersects
 * with the viewport.
 */
export class ViewportObserver {
  private readonly intersectionObserver: IntersectionObserver;
  private readonly intersection$ = new ReplaySubject<void>(1);

  /**
   * @param getIntersectionObserver Inject the intersection observer as a dependency.
   */
  constructor(
    getIntersectionObserver: (
      cb: IntersectionObserverCallback,
      opts: IntersectionObserverInit
    ) => IntersectionObserver
  ) {
    this.intersectionObserver = getIntersectionObserver(this.handleChange, {
      rootMargin: '0px',
      root: null,
    });
  }

  /**
   * Call this function to start observing.
   *
   * It is callable once only per instance and will emit only once: when an
   * element's bounding rect intersects with the viewport.
   */
  public observeElement = once((element: HTMLElement): Observable<void> => {
    this.intersectionObserver.observe(element);
    return this.intersection$.pipe(take(1));
  });

  private handleChange = ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
    if (isIntersecting) {
      this.intersection$.next(undefined);
      this.intersectionObserver.disconnect();
    }
  };
}

export function createViewportObserver(): ViewportObserver {
  return new ViewportObserver((cb, opts) => new IntersectionObserver(cb, opts));
}
