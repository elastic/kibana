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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { UiComponent } from '../../../kibana_utils/public';

const { createElement: h } = React;

export const reactToUiComponent = <Props extends object>(
  reactComp: React.ComponentType<Props>
): UiComponent<Props> => {
  let lastEl: HTMLElement | undefined;

  const render: UiComponent<Props>['render'] = (el, props) => {
    lastEl = el;
    ReactDOM.render(h(reactComp, props), el);
  };

  const unmount: UiComponent<Props>['unmount'] = () => {
    if (lastEl) ReactDOM.unmountComponentAtNode(lastEl);
  };

  const uiComp: UiComponent<Props> = {
    render,
    unmount,
  };

  return uiComp;
};
