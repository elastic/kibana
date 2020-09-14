/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    this.el = el;
    this.count = 0;
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
    this.el.setAttribute('data-render-complete', 'false');
    this.el.setAttribute('data-rendering-count', String(this.count));
  }

  public setTitle(title: string) {
    if (!this.el) return;
    this.el.setAttribute('data-title', title);
  }
}
