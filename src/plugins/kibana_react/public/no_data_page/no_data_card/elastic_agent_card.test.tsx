/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ElasticAgentCard } from './elastic_agent_card';

// jest.mock('../../context', () => ({
//   useKibana: jest.fn().mockReturnValue({
//     services: {
//       application: { capabilities: { advancedSettings: { show: true, save: true } } },
//       notifications: { toast: { addSuccess: jest.fn() } },
//     },
//   }),
// }));

// jest.mock('../../ui_settings', () => ({
//   useUiSetting$: jest.fn().mockReturnValue(['path-to-default-route', jest.fn()]),
// }));

describe('ElasticAgentCard', () => {
  test('renders', () => {
    const component = shallow(<ElasticAgentCard solution="Solution" />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('recommended', () => {
      const component = shallow(<ElasticAgentCard recommended solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('button', () => {
      const component = shallow(<ElasticAgentCard button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(<ElasticAgentCard href="#" button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });
  });
});
