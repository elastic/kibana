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
