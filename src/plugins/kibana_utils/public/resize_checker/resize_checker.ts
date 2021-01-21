/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EventEmitter } from 'events';
import { isEqual } from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';

function getSize(el: HTMLElement): [number, number] {
  return [el.clientWidth, el.clientHeight];
}

/**
 *  ResizeChecker receives an element and emits a "resize" event every time it changes size.
 */
export class ResizeChecker extends EventEmitter {
  private destroyed: boolean = false;
  private el: HTMLElement | null;
  private observer: ResizeObserver | null;
  private expectedSize: [number, number] | null = null;

  constructor(el: HTMLElement, args: { disabled?: boolean } = {}) {
    super();

    this.el = el;

    this.observer = new ResizeObserver(() => {
      if (this.expectedSize) {
        const sameSize = isEqual(getSize(el), this.expectedSize);
        this.expectedSize = null;

        if (sameSize) {
          // don't trigger resize notification if the size is what we expect
          return;
        }
      }

      this.emit('resize');
    });

    // Only enable the checker immediately if args.disabled wasn't set to true
    if (!args.disabled) {
      this.enable();
    }
  }

  public enable() {
    if (this.destroyed) {
      // Don't allow enabling an already destroyed resize checker
      return;
    }
    // the width and height of the element that we expect to see
    // on the next resize notification. If it matches the size at
    // the time of starting observing then it we will be ignored.
    // We know that observer and el are not null since we are not yet destroyed.
    this.expectedSize = getSize(this.el!);
    this.observer!.observe(this.el!);
  }

  /**
   *  Run a function and ignore all resizes that occur
   *  while it's running.
   */
  public modifySizeWithoutTriggeringResize(block: () => void): void {
    try {
      block();
    } finally {
      if (this.el) {
        this.expectedSize = getSize(this.el);
      }
    }
  }

  /**
   * Tell the ResizeChecker to shutdown, stop listenings, and never
   * emit another resize event.
   *
   * Cleans up it's listeners and timers.
   */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.observer!.disconnect();
    this.observer = null;
    this.expectedSize = null;
    this.el = null;
    this.removeAllListeners();
  }
}
