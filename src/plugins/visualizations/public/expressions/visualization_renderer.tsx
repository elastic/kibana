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

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// @ts-ignore
import { ExprVis } from './vis';
import { Visualization } from '../components';
import { VisParams } from '../types';

export const visualization = () => ({
  name: 'visualization',
  displayName: 'visualization',
  reuseDomNode: true,
  render: async (domNode: HTMLElement, config: any, handlers: any) => {
    const { visData, visConfig, params } = config;
    const visType = config.visType || visConfig.type;

    const vis = new ExprVis({
      title: config.title,
      type: visType as string,
      params: visConfig as VisParams,
    });

    vis.eventsSubject = { next: handlers.event };

    const uiState = handlers.uiState || vis.getUiState();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const listenOnChange = params ? params.listenOnChange : false;
    render(
      <Visualization
        vis={vis}
        visData={visData}
        visParams={vis.params}
        uiState={uiState}
        listenOnChange={listenOnChange}
        onInit={handlers.done}
      />,
      domNode
    );
  },
});
