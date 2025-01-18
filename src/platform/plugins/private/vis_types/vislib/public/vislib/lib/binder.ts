/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import d3 from 'd3';
import $ from 'jquery';

export interface Emitter {
  on: (...args: any[]) => void;
  off: (...args: any[]) => void;
  addListener: Emitter['on'];
  removeListener: Emitter['off'];
}

export class Binder {
  private disposal: Array<() => void> = [];

  public on(emitter: Emitter, ...args: any[]) {
    const on = emitter.on || emitter.addListener;
    const off = emitter.off || emitter.removeListener;

    on.apply(emitter, args);
    this.disposal.push(() => off.apply(emitter, args));
  }

  public destroy() {
    const destroyers = this.disposal;
    this.disposal = [];
    destroyers.forEach((fn) => fn());
  }

  jqOn(el: HTMLElement, ...args: [string, (event: JQuery.Event) => void]) {
    const $el = $(el);
    $el.on(...args);
    this.disposal.push(() => $el.off(...args));
  }

  fakeD3Bind(el: HTMLElement, event: string, handler: (event: JQuery.Event) => void) {
    this.jqOn(el, event, (e: JQuery.Event) => {
      // mimic https://github.com/mbostock/d3/blob/3abb00113662463e5c19eb87cd33f6d0ddc23bc0/src/selection/on.js#L87-L94
      const o = d3.event; // Events can be reentrant (e.g., focus).
      d3.event = e;
      try {
        // @ts-ignore
        handler.apply(this, [this.__data__]);
      } finally {
        d3.event = o;
      }
    });
  }
}
