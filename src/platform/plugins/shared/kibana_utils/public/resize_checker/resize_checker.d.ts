/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
/**
 *  ResizeChecker receives an element and emits a "resize" event every time it changes size.
 */
export declare class ResizeChecker extends EventEmitter {
  private destroyed;
  private el;
  private observer;
  private expectedSize;
  constructor(
    el: HTMLElement,
    args?: {
      disabled?: boolean;
    }
  );
  enable(): void;
  /**
   *  Run a function and ignore all resizes that occur
   *  while it's running.
   */
  modifySizeWithoutTriggeringResize(block: () => void): void;
  /**
   * Tell the ResizeChecker to shutdown, stop listenings, and never
   * emit another resize event.
   *
   * Cleans up it's listeners and timers.
   */
  destroy(): void;
}
