/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class CachedResourceObserver {
  private loaded = {
    networkOrDisk: 0,
    memory: 0,
  };
  private observer?: PerformanceObserver;

  constructor() {
    if (!window.PerformanceObserver) return;

    const cb = (entries: PerformanceObserverEntryList) => {
      const e = entries.getEntries();
      e.forEach((entry: Record<string, any>) => {
        if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
          // If the resource is fetched from a local cache, or if it is a cross-origin resource, this property returns zero.
          // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize
          if (entry.name.indexOf(window.location.host) > -1 && entry.transferSize === 0) {
            this.loaded.memory++;
          } else {
            this.loaded.networkOrDisk++;
          }
        }
      });
    };
    this.observer = new PerformanceObserver(cb);
    this.observer.observe({
      type: 'resource',
      buffered: true,
    });
  }

  public getCounts() {
    return this.loaded;
  }

  public destroy() {
    this.observer?.disconnect();
  }
}
