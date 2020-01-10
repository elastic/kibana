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
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import { spy } from 'sinon';

import { PanelsContainer, Panel } from './index';

const testComponentA = <p style={{ width: '50px' }}>A</p>;
const testComponentB = <p style={{ width: '50px' }}>B</p>;

describe('Split panel', () => {
  it('should render correctly', () => {
    const panelContainer = mount(
      <PanelsContainer>
        <Panel>{testComponentA}</Panel>
        <Panel>{testComponentB}</Panel>
      </PanelsContainer>
    );
    expect(toJson(panelContainer)).toMatchSnapshot();
  });

  it('should calculate sizes correctly on mouse drags', () => {
    // Since this test is not running in the browser we can't expect all of the
    // APIs for sizing to be available. The below is a very hacky way of setting
    // the DOMElement width so that we have a lightweight test for width calculation
    // logic.
    const div = mount(<div />);
    const proto = (div
      .find('div')
      .first()
      .getDOMNode() as any).__proto__;
    const originalGetBoundingClientRect = proto.getBoundingClientRect;

    proto.getBoundingClientRect = spy(() => {
      return {
        width: 1000,
      };
    });

    try {
      // Everything here runs sync.
      let widthsCache: number[] = [];
      const onWidthChange = (widths: number[]) => {
        widthsCache = widths;
      };

      const panelContainer = mount(
        <PanelsContainer onPanelWidthChange={onWidthChange}>
          <Panel initialWidth={'50%'}>{testComponentA}</Panel>
          <Panel initialWidth={'50%'}>{testComponentB}</Panel>
        </PanelsContainer>
      );

      const resizer = panelContainer.find(`[data-test-subj~="splitPanelResizer"]`).first();

      resizer.simulate('mousedown', { clientX: 0 });
      resizer.simulate('mousemove', { clientX: 250 });
      resizer.simulate('mouseup');

      panelContainer.update();

      expect(widthsCache).toEqual([125, 75]);
    } finally {
      proto.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});
