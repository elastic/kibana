/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ElasticAgentCardComponent } from './elastic_agent_card.component';

describe('ElasticAgentCard', () => {
  test('renders', () => {
    const component = shallow(<ElasticAgentCardComponent canAccessFleet={true} />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('recommended', () => {
      const component = shallow(<ElasticAgentCardComponent recommended canAccessFleet={true} />);
      expect(component).toMatchSnapshot();
    });

    test('button', () => {
      const component = shallow(
        <ElasticAgentCardComponent button="Button" canAccessFleet={true} />
      );
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(
        <ElasticAgentCardComponent button="Button" canAccessFleet={true} href={'some path'} />
      );
      expect(component).toMatchSnapshot();
    });

    test('category', () => {
      const component = shallow(
        <ElasticAgentCardComponent category="custom" canAccessFleet={true} />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
