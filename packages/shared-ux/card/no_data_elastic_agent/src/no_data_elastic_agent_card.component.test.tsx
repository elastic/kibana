/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NoDataCard } from '@kbn/shared-ux-card-no-data';

import { NoDataElasticAgentCard } from './no_data_elastic_agent_card.component';

describe('ElasticAgentCardComponent', () => {
  test('renders', () => {
    const component = shallow(<NoDataElasticAgentCard canAccessFleet={true} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with canAccessFleet false', () => {
    const component = shallow(<NoDataElasticAgentCard canAccessFleet={false} />);
    expect(component.find(NoDataCard).props().isDisabled).toBe(true);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('button', () => {
      const component = shallow(<NoDataElasticAgentCard button="Button" canAccessFleet={true} />);
      expect(component.find(NoDataCard).props().button).toBe('Button');
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(
        <NoDataElasticAgentCard canAccessFleet={true} href={'some path'} />
      );
      expect(component.find(NoDataCard).props().href).toBe('some path');
      expect(component).toMatchSnapshot();
    });
  });
});
