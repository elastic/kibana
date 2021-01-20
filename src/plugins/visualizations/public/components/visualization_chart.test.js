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
import { VisualizationChart } from './visualization_chart';

let renderPromise;

class VisualizationStub {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
  }

  render() {
    renderPromise = new Promise((resolve) => {
      this.el.textContent = this.vis.params.markdown;
      resolve();
    });

    return renderPromise;
  }
}

describe('<VisualizationChart/>', () => {
  const vis = {
    type: {
      title: 'Test Visualization',
      visualization: VisualizationStub,
    },
    params: {
      markdown:
        'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.',
    },
  };

  it('should render initial html', () => {
    const wrapper = render(<VisualizationChart vis={vis} listenOnChange={true} />);
    expect(wrapper.text()).toBe('');
  });

  it('should render visualization', async () => {
    const wrapper = mount(<VisualizationChart vis={vis} />);
    jest.runAllTimers();
    await renderPromise;
    expect(wrapper.find('.visChart').text()).toMatch(/markdown/);
  });
});
