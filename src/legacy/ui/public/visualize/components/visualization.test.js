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

jest.useFakeTimers();

import React from 'react';
import { render, mount } from 'enzyme';
import { Visualization } from './visualization';

let renderPromise;
class VisualizationStub {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
  }

  render() {
    renderPromise = new Promise((resolve) => {
      this.el.innerText = this.vis.params.markdown;
      resolve();
    });

    return renderPromise;
  }
}

describe('<Visualization/>', () => {

  const visData = {
    hits: 1
  };

  const uiState = {
    on: () => {},
    off: () => {},
    set: () => {}
  };

  let vis;

  beforeEach(() => {
    vis = {
      _setUiState: function (uiState) {
        this.uiState = uiState;
      },
      getUiState: function () {
        return this.uiState;
      },
      params: {
      },
      type: {
        title: 'new vis',
        requiresSearch: true,
        useCustomNoDataScreen: false,
        visualization: VisualizationStub
      }
    };
  });

  it('should display no result message when length of data is 0', () => {
    const data = { rows: [] };
    const wrapper = render(<Visualization vis={vis} visData={data} listenOnChange={true} uiState={uiState} />);
    expect(wrapper.text()).toBe('No results found');
  });

  it('should display error message when there is a request error that should be shown and no data', () => {
    const errorVis = { ...vis, requestError: { message: 'Request error' }, showRequestError: true };
    const data = null;
    const wrapper = render(<Visualization vis={errorVis} visData={data} listenOnChange={true} uiState={uiState} />);
    expect(wrapper.text()).toBe('Request error');
  });

  it('should render chart when data is present', () => {
    const wrapper = render(<Visualization vis={vis} visData={visData} uiState={uiState} listenOnChange={true} />);
    expect(wrapper.text()).not.toBe('No results found');
  });

  it('should call onInit when rendering no data', () => {
    const spy = jest.fn();
    const noData = { hits: 0 };
    mount(
      <Visualization
        vis={vis}
        visData={noData}
        uiState={uiState}
        listenOnChange={false}
        onInit={spy}
      />
    );
    expect(spy).toHaveBeenCalled();
  });
});
