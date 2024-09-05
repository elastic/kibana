/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import { spy } from 'sinon';

import { Panel } from './panel';
import { PanelsContainer } from './panel_container';

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
    const proto = (div.find('div').first().getDOMNode() as any).__proto__;
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
          <Panel initialWidth={50}>{testComponentA}</Panel>
          <Panel initialWidth={50}>{testComponentB}</Panel>
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
