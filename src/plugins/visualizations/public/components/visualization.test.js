/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    hits: 1,
  };

  const uiState = {
    on: () => {},
    off: () => {},
    set: () => {},
  };

  let vis;

  beforeEach(() => {
    vis = {
      setUiState: function (uiState) {
        this.uiState = uiState;
      },
      getUiState: function () {
        return this.uiState;
      },
      params: {},
      type: {
        title: 'new vis',
        requiresSearch: true,
        useCustomNoDataScreen: false,
        visualization: VisualizationStub,
      },
    };
  });

  it('should display no result message when length of data is 0', () => {
    const data = { rows: [] };
    const wrapper = render(
      <Visualization vis={vis} visData={data} listenOnChange={true} uiState={uiState} />
    );
    expect(wrapper.text()).toBe('No results found');
  });

  it('should render chart when data is present', () => {
    const wrapper = render(
      <Visualization vis={vis} visData={visData} uiState={uiState} listenOnChange={true} />
    );
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
