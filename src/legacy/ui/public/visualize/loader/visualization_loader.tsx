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

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { PersistedState } from '../../persisted_state';
import { Vis } from '../../vis';
import { Visualization } from '../components/visualization';

interface VisualizationLoaderParams {
  listenOnChange?: boolean;
}

function renderVisualization(
  element: HTMLElement,
  vis: Vis,
  visData: any,
  visParams: any,
  uiState: PersistedState,
  params: VisualizationLoaderParams
) {
  return new Promise(resolve => {
    const listenOnChange = _.get(params, 'listenOnChange', false);
    render(
      <Visualization
        vis={vis}
        visData={visData}
        visParams={visParams}
        uiState={uiState}
        listenOnChange={listenOnChange}
        onInit={resolve}
      />,
      element
    );
  });
}

function destroy(element?: HTMLElement) {
  if (element) {
    unmountComponentAtNode(element);
  }
}

export const visualizationLoader = {
  render: renderVisualization,
  destroy,
};
