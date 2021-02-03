/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * In many places in Kibana we want to be agnostic to frontend view library,
 * i.e. instead of exposing React-specific APIs we want to expose APIs that
 * are orthogonal to any rendering library. This interface represents such UI
 * components. UI component receives a DOM element and `props` through `render()`
 * method, the `render()` method can be called many times.
 *
 * Although Kibana aims to be library agnostic, Kibana itself is written in React,
 * thus here we define `UiComponent` which is an abstract unit of UI that can be
 * implemented in any framework, but it maps easily to React components, i.e.
 * `UiComponent<Props>` is like `React.ComponentType<Props>`.
 */
export type UiComponent<Props extends object = object> = () => UiComponentInstance<Props>;

/**
 * Instance of an UiComponent, corresponds to React virtual DOM node.
 */
export interface UiComponentInstance<Props extends object = object> {
  /**
   * Call this method on initial render and on all subsequent updates.
   *
   * @param el DOM element.
   * @param props Component props, same as props in React.
   */
  render(el: HTMLElement, props: Props): void;

  /**
   * Un-mount UI component. Call it to remove view from DOM. Implementers of this
   * interface should clear DOM from this UI component and destroy any internal state.
   */
  unmount?(): void;
}
