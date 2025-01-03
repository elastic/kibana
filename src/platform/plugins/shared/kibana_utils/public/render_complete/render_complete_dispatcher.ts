/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const dispatchEvent = (el: HTMLElement, eventName: string) => {
  el.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
};

export function dispatchRenderComplete(el: HTMLElement) {
  dispatchEvent(el, 'renderComplete');
}

export function dispatchRenderStart(el: HTMLElement) {
  dispatchEvent(el, 'renderStart');
}

/**
 * Should call `dispatchComplete()` when UI block has finished loading its data and has
 * completely rendered. Should `dispatchInProgress()` every time UI block
 * starts loading data again. At the start it is assumed that UI block is loading
 * so it dispatches "in progress" automatically, so you need to call `setRenderComplete`
 * at least once.
 *
 * This is used for reporting to know that UI block is ready, so
 * it can take a screenshot. It is also used in functional tests to know that
 * page has stabilized.
 */
export class RenderCompleteDispatcher {
  private count: number = 0;
  private el?: HTMLElement;

  constructor(el?: HTMLElement) {
    this.setEl(el);
  }

  public setEl(el?: HTMLElement) {
    if (this.el !== el) {
      this.el = el;
      this.count = 0;
    }
    if (el) this.dispatchInProgress();
  }

  public dispatchInProgress() {
    if (!this.el) return;
    this.el.setAttribute('data-render-complete', 'false');
    this.el.setAttribute('data-rendering-count', String(this.count));
    dispatchRenderStart(this.el);
  }

  public dispatchComplete() {
    if (!this.el) return;
    this.count++;
    this.el.setAttribute('data-render-complete', 'true');
    this.el.setAttribute('data-rendering-count', String(this.count));
    dispatchRenderComplete(this.el);
  }

  public dispatchError() {
    if (!this.el) return;
    this.count++;
    this.el.setAttribute('data-render-complete', 'true');
    this.el.setAttribute('data-rendering-count', String(this.count));
  }

  public setTitle(title: string) {
    if (!this.el) return;
    this.el.setAttribute('data-title', title);
  }
}
