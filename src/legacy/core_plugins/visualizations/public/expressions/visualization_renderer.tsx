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

import chrome from 'ui/chrome';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// @ts-ignore
import { Vis } from './vis';
import { Visualization } from '../../../visualizations/public/np_ready/public/components';

export const visualization = () => ({
  name: 'visualization',
  displayName: 'visualization',
  reuseDomNode: true,
  render: async (domNode: HTMLElement, config: any, handlers: any) => {
    const { visData, visConfig, params } = config;
    const visType = config.visType || visConfig.type;
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const $rootScope = $injector.get('$rootScope') as any;

    if (handlers.vis) {
      // special case in visualize, we need to render first (without executing the expression), for maps to work
      if (visConfig) {
        $rootScope.$apply(() => {
          handlers.vis.setCurrentState({
            type: visType,
            params: visConfig,
            title: handlers.vis.title,
          });
        });
      }
    } else {
      handlers.vis = new Vis({
        type: visType,
        params: visConfig,
      });
    }

    handlers.vis.eventsSubject = { next: handlers.event };

    const uiState = handlers.uiState || handlers.vis.getUiState();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const listenOnChange = params ? params.listenOnChange : false;
    render(
      <Visualization
        vis={handlers.vis}
        visData={visData}
        visParams={handlers.vis.params}
        uiState={uiState}
        listenOnChange={listenOnChange}
        onInit={handlers.done}
      />,
      domNode
    );
  },
});
