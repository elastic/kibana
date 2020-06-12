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

import { ComponentType, createElement as h } from 'react';
import { render as renderReact, unmountComponentAtNode } from 'react-dom';
import { UiComponent, UiComponentInstance } from '../../../kibana_utils/public';

/**
 * Transform a React component into a `UiComponent`.
 *
 * @param ReactComp A React component.
 */
export const reactToUiComponent = <Props extends object>(
  ReactComp: ComponentType<Props>
): UiComponent<Props> => () => {
  let lastEl: HTMLElement | undefined;

  const render: UiComponentInstance<Props>['render'] = (el, props) => {
    lastEl = el;
    renderReact(h(ReactComp, props), el);
  };

  const unmount: UiComponentInstance<Props>['unmount'] = () => {
    if (lastEl) unmountComponentAtNode(lastEl);
  };

  const comp: UiComponentInstance<Props> = {
    render,
    unmount,
  };

  return comp;
};
